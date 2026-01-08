import { Component, OnInit, signal,model,ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonCardContent,IonRow,IonCol,IonButton,IonIcon,IonCard,
  IonCardTitle,IonCardHeader,IonGrid,IonSpinner,IonRange,IonInput,RangeCustomEvent,IonButtons,IonToolbar,IonToggle,IonLabel} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline, peopleOutline, arrowBack,warningOutline} from 'ionicons/icons';
// API keys
import { environment } from '../../../environments/environment';
// impor to display the map
import { MapDisplayComponent } from '../../components/map-display/map-display.component';
import { MenuScreenComponent } from '../../components/menu-screen/menu-screen.component';
// gets API key from file
const mapKey = environment.mapsKey;

@Component({
  selector: 'app-userhome',
  templateUrl: './userhome.page.html',
  styleUrls: ['./userhome.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule,IonCardContent,IonRow,IonCol,IonButton,
    IonIcon,IonCard,IonCardTitle,IonCardHeader,IonGrid,IonSpinner,IonRange,IonToggle, MapDisplayComponent,IonInput,IonButtons,IonToolbar,MenuScreenComponent,IonLabel]
})
export class UserhomePage implements OnInit {
  //allows us to use functions defined in map component 
  @ViewChild('mapComp') mapComponent!: MapDisplayComponent;

  // holds coordinates for last pin 
  lastPin: {lat: number,lng:number} | null = null;

  mapReady = signal(false);
  // holds all toggles for each factor
  speedToggled:boolean = false;
  curveToggled:boolean = false;
  weatherToggled:boolean = false;
  lightToggled:boolean = false;
  pinCheck = signal(true);

  // holds value for circle drag slider
  sliderPercent:number = 1000;


  onIonChange(event:RangeCustomEvent){
    const newRadius = event.detail.value as number;
    
    this.sliderPercent = newRadius*10;
    // checks if user placed a pin to update circle with pin
    if(this.lastPin){
      this.mapComponent.updateRideCircle(this.lastPin.lat,this.lastPin.lng,this.sliderPercent);
    }
    console.log(this.sliderPercent);
  }
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
    addIcons({ addCircleOutline, peopleOutline,arrowBack,warningOutline});
  }
  ngOnInit() {
  }

  // send data to map component to create a pin with circle
  onPinDropped(coords: any){
    this.lastPin = coords;
    this.mapComponent.updateRideCircle(coords.lat,coords.lng,this.sliderPercent);
    this.pinCheck.set(false);
  }


  createGroup(){
    //creates group code for user
    const code = Math.random().toString(36).substring(2,8).toUpperCase();
    this.groupCode.set(code);
    //changes users view
    this.currentView.set('create');
  }

  // Card routes (what user can see)
  selectGroup(){this.currentView.set('group');}
  goBack(){this.currentView.set('selection');}
  joinGroup(){this.currentView.set('join');}
  startSession(){this.currentView.set('start');}
}
