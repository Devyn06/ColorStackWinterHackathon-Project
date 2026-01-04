import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA,ViewChild,ElementRef,signal,output} from '@angular/core';
import { ToastController} from '@ionic/angular/standalone';
import { GoogleMap } from '@capacitor/google-maps';
import { environment } from '../../../environments/environment';
import { Geolocation } from '@capacitor/geolocation';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  // output values sent to userhome page
  mapReady = output<boolean>();
  // tells userhome location of pin
  pinDropped = output<{lat: number, lng: number}>();
  
  // injects toastController, used when location services is denied
  constructor(private toastController:ToastController) { }

  ngOnInit() {}

  @ViewChild('mapElement') mapRef!: ElementRef<HTMLElement>;
  newMap!: GoogleMap;
  async ngAfterViewInit(){
    await this.initMapAtCurrentLocation();
  }
  
  async initMapAtCurrentLocation(){
      try{
        //device lat and long 
        const { latitude, longitude } = (await this.getDeviceGeoLocation()).coords;
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

        // listener to connect native maps 'click' event to our function 
        await this.newMap.setOnMapClickListener((event) =>{
          this.createPin(event);
        });

        // shows your current location on map *Blue dot*
        await this.newMap.enableCurrentLocation(true);
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
    async ngOnDestroy(){
    if (this.newMap){
      await this.newMap.destroy();
    }
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
    async getDeviceGeoLocation(){
      // Checks if permission is given from USER
        let permStatus = await Geolocation.checkPermissions();
        if (permStatus.location !== 'granted'){
          permStatus = await Geolocation.requestPermissions();
          if (permStatus.location !== 'granted'){
            //throws error if user denies location services
            throw new Error('Failed to load map. Please allow location services.');
          }
        }
        // gets device location
        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy:true,
          timeout: 30000,
          maximumAge: 60000 // accepts cached location up to 1 minute old
        });
        return coordinates;
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
      if(this.circleId){
        await this.newMap.removeCircles([this.circleId]);
      }

      //creates a new circle
      const circleOptions = {
        center: {lat, lng},
        radius: radius,
        fillColor: '#3880ff',
        fillOpacity: 0.2,
        strokeColor: '#3880ff',
        strokeWeight: 2
      };
      const result = await this.newMap.addCircles([circleOptions]);
      // circle id is stored to update or delete later
      this.circleId = result[0];
    }
}
