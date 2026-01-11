import { Component, inject, OnInit, CUSTOM_ELEMENTS_SCHEMA,ViewChild,ElementRef,signal,output} from '@angular/core';
import { ToastController} from '@ionic/angular/standalone';
import { GoogleMap } from '@capacitor/google-maps';
import { environment } from '../../../environments/environment';
import {LocationService} from '../../services/location.service';
import {TrackingService} from '../../services/tracking.service';
import {AuthService} from '../../services/auth.service';
import {GroupService} from '../../services/group.service';
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
export class MapDisplayComponent implements OnInit {

  private markerIds: string[] = []; // for the current user's marker
  private friendMarkers: Map<string, string> = new Map();
  private circleId: string | null = null;
  // output values sent to userhome page
  mapReady = output<boolean>();
  // tells userhome location of pin
  pinDropped = output<{lat: number, lng: number}>();

  // injects toastController, used when location services is denied
  constructor(
    private toastController:ToastController,
    private locationService:LocationService,
    private trackingService:TrackingService,
    private authService:AuthService,
    private groupService:GroupService) { }

  private lastSave = 0;
  private readonly SAVE_INTERVAL = 10000 // 10 secs

  private sessionId = "ERR";

  ngOnInit() {}

  @ViewChild('mapElement') mapRef!: ElementRef<HTMLElement>;
  newMap!: GoogleMap;
  async ngAfterViewInit(){
    await this.initMapAtCurrentLocation();
  }

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
        const userId = await this.authService.getUserId();
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
              const groupId = this.groupService.groupCode();
              if (userId) {
                this.trackingService.saveLocationToFirebase(userId, pos, groupId);
                this.lastSave = currentTime;
              }
            }
          }
        });
        // toggles loading spinner
        this.mapReady.emit(true);

        // Remove location when disconnected
        if (userId) {
          this.trackingService.cutLocationOnDisconnect(userId)
        }
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
    await this.locationService.stopWatching();
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
        strokeWeight: 2,
        clickable: false
      };
      const result = await this.newMap.addCircles([circleOptions]);
      // circle id is stored to update or delete later
      this.circleId = result[0];
    }

   async updateMemberMarkers(members: any) {
     if (!this.newMap) return; // return if map doesn't exist

     const userId = await this.authService.getUserId();
     const markerConfigs: any[] = [];
     const membersInSync = Object.keys(members);

     for (const uid of membersInSync) {
       if (uid == userId) continue;

       const {lat, lng} = members[uid];

       // Marker exists, move it
       if (this.friendMarkers.has(uid)) {
         await this.newMap.removeMarkers([this.friendMarkers.get(uid)!]);
       }

       const markerId = await this.newMap.addMarker({
          coordinate: { lat, lng },
          title: 'Friend',
          // iconUrl: '', // optional path to image instead of pin
        });

        this.friendMarkers.set(uid, markerId);
     }

   for (const [uid, markerId] of this.friendMarkers.entries()) {
     if (!members[uid]) {
       await this.newMap.removeMarkers([markerId]);
       this.friendMarkers.delete(uid);
     }
   }
 }

  async clearAllFriendMarkers() {
    if (!this.newMap) return;

    // get stored marker IDs
    const markerIds = Array.from(this.friendMarkers.values());

    // remove all of the markers from the map
    if (markerIds.length > 0) {
      await this.newMap.removeMarkers(markerIds);
    }

    // clear internal registry
    this.friendMarkers.clear();
    console.log("All friend markers cleared from map.");
  }
}
