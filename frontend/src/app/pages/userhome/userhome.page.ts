import { Component, OnInit, signal,model,ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonCardContent,IonRow,IonCol,IonButton,IonIcon,IonCard,
  IonCardTitle,IonCardHeader,IonGrid,IonSpinner,IonInput,IonButtons,IonToolbar} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline, peopleOutline, arrowBack} from 'ionicons/icons';
// API keys
import { environment } from '../../../environments/environment';
// impor to display the map
import { MapDisplayComponent } from '../../components/map-display/map-display.component';
// gets API key from file
const mapKey = environment.mapsKey;

@Component({
  selector: 'app-userhome',
  templateUrl: './userhome.page.html',
  styleUrls: ['./userhome.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule,IonCardContent,IonRow,IonCol,IonButton,
    IonIcon,IonCard,IonCardTitle,IonCardHeader,IonGrid,IonSpinner, MapDisplayComponent,IonInput,IonButtons,IonToolbar]
})
export class UserhomePage implements OnInit {
  //allows us to use functions defined in map component 
  @ViewChild('mapComp') mapComponent!: MapDisplayComponent;
  // holds coordinates for last pin 
  lastPin: {lat: number,lng:number} | null = null;
  mapReady = signal(false);

  // what the user will view changes the on screen "cards" 
  currentView = signal<'selection' | 'group' | 'create' | 'join' | 'start'>('selection');

  // holds group leaders code
  groupCode = signal('');
  // holds user inputted code "writeable signal" 2 way binding
  userJoinCode = model('');

  //receieves signal from map component 
  onMapReady(isReady:boolean){
    this.mapReady.set(isReady);
  }
  constructor() {
    addIcons({ addCircleOutline, peopleOutline,arrowBack});
  }
  ngOnInit() {
  }

  // function is called 
  onPinDropped(coords: any){
    this.lastPin = coords;
    this.mapComponent.updateRideCircle(coords.lat,coords.lng,500);
  }
  onRadiusChange(event:any){
    if(this.lastPin){
      const newRadius = event.detail.value;
      this.mapComponent.updateRideCircle(this.lastPin.lat,this.lastPin.lng,newRadius);
    }
  }


  selectGroup(){
    this.currentView.set('group');
  }
  createGroup(){
    //creates code for user
    const code = Math.random().toString(36).substring(2,8).toUpperCase();
    this.groupCode.set(code);
    //changes users view
    this.currentView.set('create');
  }
  goBack(){
    this.currentView.set('selection');
  }
  joinGroup(){
    this.currentView.set('join');
  }
  startSession(){
    this.currentView.set('start');
  }
}
