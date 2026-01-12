import { Component, inject, OnInit, CUSTOM_ELEMENTS_SCHEMA,ViewChild,ElementRef,signal,output} from '@angular/core';
import { ToastController} from '@ionic/angular/standalone';
import { GoogleMap,Polyline,LatLngBounds } from '@capacitor/google-maps';
import { environment } from '../../../environments/environment';
import {LocationService} from '../../services/location.service';
import {TrackingService} from '../../services/tracking.service';
import {AuthService} from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as polyline from '@mapbox/polyline';
// api key
const mapKey = environment.mapsKey;
@Component({
  selector: 'app-map-display',
  templateUrl: './map-display.component.html',
  styleUrls: ['./map-display.component.scss'],
  schemas:[CUSTOM_ELEMENTS_SCHEMA],
  imports: [ CommonModule, FormsModule],
})
export class MapDisplayComponent  implements OnInit {

  private markerIds: string[] = [];
  private circleId: string | null = null;
  private routePolylineIds: string[]=[]; // Track Route Lines
  private circleUpdateLock = false;
  // output values sent to userhome page
  mapReady = output<boolean>();

  // tells userhome location of pin
  pinDropped = output<{lat: number, lng: number}>();
  
  // Injections
  constructor(private toastController:ToastController,private locationService:LocationService) { }
  // services to use in map
  private trackingService = inject(TrackingService);
  private authService = inject(AuthService);

  private lastSave = 0;
  private readonly SAVE_INTERVAL = 10000 // 10 secs

  private sessionId = "ERR";

  //life cycle hooks
  ngOnInit() {}
  async ngAfterViewInit(){
    await this.initMapAtCurrentLocation();
  }

  async ngOnDestroy(){
      if (this.newMap){await this.newMap.destroy();}
      if (this.routePolylineIds.length > 0){
        await this.newMap.removePolylines(this.routePolylineIds);
      }
      if (this.circleId){await this.newMap.removeCircles([this.circleId])}; 
      this.circleId = null;
      await this.locationService.stopWatching();
  }


  @ViewChild('mapElement') mapRef!: ElementRef<HTMLElement>;
  newMap!: GoogleMap;

  async initMapAtCurrentLocation(){
      try{
        //calls service to retrieve device coordinates
        const coordinates = await this.locationService.getCurrentLocation();
        const { latitude, longitude } = coordinates.coords;

        // creates the map with geolocation
        this.newMap = await GoogleMap.create({
          id: 'moto-safe',
          element: this.mapRef.nativeElement,
          apiKey: mapKey,
          config: {
            center: { lat: latitude, lng: longitude },
            zoom: 15
            }
        });

        const date = new Date();
        this.sessionId = date.toISOString()
          .split('.')[0]          // Remove milliseconds
          .replace(/:/g, '-')     // Replace colons with dashes
          .replace('T', '_');     // Replace 'T' with underscore


        // listener to connect native maps 'click' event to our function
        await this.newMap.setOnMapClickListener((event) =>{
          this.createPin(event);
        });

        // shows your current location on map *Blue dot* ONLY TO LOAD MAP
        await this.newMap.enableCurrentLocation(true);

        // shows LIVE location as you move
        await this.locationService.watchPosition(async (pos) => {
          if(pos && this.newMap){
            this.newMap.setCamera({
              coordinate:{
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
              },
              animate:true
            });
            // Only update if more than 5 seconds have passed
            const currentTime = Date.now();
            if (currentTime - this.lastSave > this.SAVE_INTERVAL) {
              const userId = await this.authService.getUserId();
              if (userId) {
                this.trackingService.saveLocationToFirebase(userId, this.sessionId, pos);
                this.lastSave = currentTime;
              }
            }
          }
        });
        // toggles loading spinner
        this.mapReady.emit(true);


      } catch (err:any){
          console.error("Map initilization failed:",err);
          const errMsg = err?.message || 'Failed to load map. Please allow location services.';
          //calls function to show user a toast message with error that was caught
          await this.showErrorToast(errMsg);
          this.mapReady.emit(false);
      }
    }


    async displayRoutes(routes:any[]){
      if (!this.newMap || !routes || routes.length == 0) return;
      if (this.routePolylineIds.length > 0){
        await this.newMap.removePolylines(this.routePolylineIds);
        this.routePolylineIds = [];
      }

      // stores configured polylines
      const polylinesConfig: Polyline[] = [];
      const allPoints: {lat:number; lng: number} []=[];

       
      routes.forEach((route,index) =>{
      
        const decodedPath = polyline.decode(route.polyline);

        const points = decodedPath.map( point => ({
          lat: point[0],
          lng: point[1]
        }));

        allPoints.push(...points);

        // First route is blue rest are gray
        const polyConfig:any = ({
          path: points,
          strokeColor: index === 0 ? '#3880ff' : '#8e8e93',
          strokeWeight: index === 0 ? 6 : 4,
          strokeOpacity: index === 0 ? 1.0 : 0.5,
          zIndex: index === 0 ? 10 : 1 // best routes stays on top
        });

        polylinesConfig.push(polyConfig);
      });

      this.routePolylineIds = await this.newMap.addPolylines(polylinesConfig);
      
      // re-centers to fit all routes
      await this.focusRoutes(allPoints);

    }

    // creates bounds for re centering view
    private async focusRoutes(points: { lat: number, lng: number}[]){
      
      if (points.length === 0) return;
      
      // filters points
      const lats = points.map(p=>p.lat);
      const lngs = points.map(p=>p.lng);
      
      const bounds : LatLngBounds = {
        southwest:  {lat: Math.min(...lats), lng: Math.min(...lngs)},
        northeast: {lat: Math.max(...lats), lng: Math.max(...lngs)}
      }as any;

      await this.newMap.fitBounds(bounds);
    }

    private async showErrorToast(message: string){
      // creates message display for user with error message
      const toast = await this.toastController.create({
        message,
        duration: 5000,
        position: 'bottom',
        color: 'danger'
      });
      //displays toast
      await toast.present();
    }

    // creates MARKER for google map
    async createPin(event: any){
      const {latitude,longitude} = event;
      //condition to maintain only one marker on map
      if (this.markerIds.length > 0){
        await this.newMap.removeMarkers(this.markerIds);
        this.markerIds = [];
      }
      //returns a unique string ID from native SDK to DELETE later : this adds the marker
      const id = await this.newMap.addMarker({
        coordinate:{lat: latitude, lng: longitude},
      });
      // array to keep track of markerIds to delete later
      this.markerIds.push(id);
      // updates lat and lng to userHome
      this.pinDropped.emit({lat:latitude,lng:longitude});
    }

    // updates circle 

    async updateRideCircle(lat:number,lng:number,radius:number){
      // condition to delete circle if a circle exists
      if(this.circleUpdateLock){return;}
      this.circleUpdateLock = true;

      try{
        if(this.circleId){
          await this.newMap.removeCircles([this.circleId]);
          this.circleId=null;
        }
        //creates a new circle
        const circleOptions = {
          center: {lat, lng},
          radius: radius,
          fillColor: '#3880ff',
          fillOpacity: 0.2,
          strokeColor: '#3880ff',
          strokeWeight: 2,
          clickable: false
        };
        
        const result = await this.newMap.addCircles([circleOptions]);
        
        // circle id is stored to update or delete later
        this.circleId = result[0];
      
      } 
      // prevents deadlock
      finally{
        this.circleUpdateLock=false;
      }
    }
}
