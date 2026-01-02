import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA,ViewChild,ElementRef, signal,output} from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonCardContent,IonRow,IonCol,IonButton,IonIcon,IonCard,
  IonCardTitle,IonCardHeader,IonGrid,ToastController,IonSpinner} from '@ionic/angular/standalone';
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
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonCardContent,IonRow,IonCol,IonButton,
    IonIcon,IonCard,IonCardTitle,IonCardHeader,IonGrid,IonSpinner],
})
export class MapDisplayComponent  implements OnInit {
  mapReady = output<boolean>();
  constructor(private toastController:ToastController) { }

  ngOnInit() {}

  @ViewChild('mapElement') mapRef!: ElementRef<HTMLElement>;
  newMap!: GoogleMap;
  async ngAfterViewInit(){
    await this.initMapAtCurrentLocation();
  }
  async initMapAtCurrentLocation(){
      try{
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
  
        //device lat and long 
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
        // shows your current location on map *Blue dot*
        await this.newMap.enableCurrentLocation(true);
        // toggles loading spinner
        this.mapReady.emit(true);
        console.log("emiitted true");
      } catch (err:any){
          console.error("Map initilization failed:",err);
          const errMsg = err?.message || 'Failed to load map. Please allow location services.';
          //calls function to show user a toast message with error that was caught 
          await this.showErrorToast(errMsg);
          this.mapReady.emit(false);
          console.log("emiitted false");
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
}
