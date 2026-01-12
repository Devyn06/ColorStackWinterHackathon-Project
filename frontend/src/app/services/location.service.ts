import { Injectable,signal } from '@angular/core';
import {Geolocation,Position} from '@capacitor/geolocation';
@Injectable({
  providedIn: 'root',
})
export class LocationService {
  // holds geolocation
  public currentPosition = signal<Position | null>(null);
  // stores watchId to later turn it off
  private activeWatchId: string | null = null;

  constructor(){}

  async checkAndRequestPermissions():Promise<boolean>{
    const permStatus = await Geolocation.checkPermissions();
  
    // If already granted, we are good to go!
    if (permStatus.location === 'granted') return true;

    // If not, ask for it
    const newStatus = await Geolocation.requestPermissions();
    return newStatus.location === 'granted';
  }
  
  // ONLY used for map loadup 
  async getCurrentLocation(){
    const hasPermission = await this.checkAndRequestPermissions();
    if (!hasPermission){
      throw new Error('Location permission was not granted for device');
    }
    const coordinates = await Geolocation.getCurrentPosition({
      enableHighAccuracy:true,
      timeout: 30000,
      maximumAge: 60000
    });
    // stores coordinates to instance variable
    this.currentPosition.set(coordinates);
    return coordinates;
  }

  // this will be used to continuosly watch the users position 
  async watchPosition(callback:(pos:Position | null) => void){
    // checks if location was granted
    const hasPermission = await this.checkAndRequestPermissions();
    if (!hasPermission){
      return null;
    }
    // condition to hold only one live watch
    if (this.activeWatchId) {
      await this.stopWatching();
    }
    this.activeWatchId = await Geolocation.watchPosition(
      {enableHighAccuracy:true,timeout:5000},
      (position)=>{
        this.currentPosition.set(position);
        callback(position);
      }
    );
    return this.activeWatchId;
  }
  // function used to stop live tracking 
  async stopWatching(){
    if(this.activeWatchId){
      await Geolocation.clearWatch({id: this.activeWatchId });
      this.activeWatchId=null;
      console.log('GPS livetracking stopped')
    }
  }
}
