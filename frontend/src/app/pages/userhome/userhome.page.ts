import { Component, OnInit, signal,model,ViewChild,Renderer2, ElementRef,OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonCardContent,IonRow,IonCol,IonButton,IonIcon,IonCard,
  IonCardTitle,IonCardHeader,IonGrid,IonSpinner,IonRange,IonInput,RangeCustomEvent,IonButtons,IonToolbar,IonToggle,IonLabel,IonFooter} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {LocationService} from '../../services/location.service';
import { addCircleOutline, peopleOutline, arrowBack,warningOutline} from 'ionicons/icons';

// API keys
import { environment } from '../../../environments/environment';

// impor to display the map
import { MapDisplayComponent } from '../../components/map-display/map-display.component';
import { MenuScreenComponent } from '../../components/menu-screen/menu-screen.component';
import { Keyboard } from '@capacitor/keyboard';
import { Router} from '@angular/router';

// gets API key from file
const mapKey = environment.mapsKey;

@Component({
  selector: 'app-userhome',
  templateUrl: './userhome.page.html',
  styleUrls: ['./userhome.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule,IonCardContent,IonRow,IonCol,IonButton,
    IonIcon,IonCard,IonCardTitle,IonCardHeader,IonGrid,IonSpinner,IonRange,IonToggle, MapDisplayComponent,IonInput,IonButtons,IonToolbar,MenuScreenComponent,IonLabel,IonFooter]
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
  display = signal(true);
  
  // holds value for circle drag slider
  sliderPercent:number = 1000;

  // live time 
  currentTime = signal<string>('');
  private timer: any;

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
  currentView = signal<'selection' | 'group' | 'create' | 'join' | 'start' |'tracking'|'end'|'lobby'>('selection');
  
  // User Codes
  groupCode = signal('');
  userJoinCode = model('');

  //receieves signal from map component 
  onMapReady(isReady:boolean){
    this.mapReady.set(isReady);
  }


  constructor(
    private router:Router,
    private renderer: Renderer2,
    private el: ElementRef,
    private locationService:LocationService) {

    addIcons({ addCircleOutline, peopleOutline,arrowBack,warningOutline});
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  
  ngOnInit() {
    this.updateTime();
    // Refresh the time every second
    this.timer = setInterval(() => {
      this.updateTime();
      console.log(this.currentTime());
    }, 1000);

    // When keyboard shows, move it up
    Keyboard.addListener('keyboardWillShow', (info) => {
      const container = this.el.nativeElement.querySelector('.bottom-container');
      if (container) {
        this.renderer.setStyle(container, 'transform', `translateY(-${info.keyboardHeight}px)`);
      }
    });

    // When keyboard hides, move it back down
    Keyboard.addListener('keyboardWillHide', () => {
      const container = this.el.nativeElement.querySelector('.bottom-container');
      if (container) {
        this.renderer.setStyle(container, 'transform', 'translateY(0)');
      }
    });
  }

  // send data to map component to create a pin with circle
  onPinDropped(coords: any){
    this.lastPin = coords;
    this.mapComponent.updateRideCircle(coords.lat,coords.lng,this.sliderPercent);
    this.pinCheck.set(false);
  }
  
  // code generator
  createGroup(){
    const code = Math.random().toString(36).substring(2,8).toUpperCase();
    this.groupCode.set(code);
    this.currentView.set('create');
  }

  // gets Live time
  updateTime() {
    const now = new Date();
    this.currentTime.set(now.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }));
  }
  // Card routes (what user can see)
  selectGroup(){this.currentView.set('group');}
  goBack(){this.currentView.set('selection'); this.display.set(true);}
  joinGroup(){this.currentView.set('join');}
  startSession(){this.currentView.set('start'); this.display.set(true);}
  async confirm(){

    this.currentView.set('tracking');
    this.display.set(false);

    const position = this.locationService.currentPosition();
    
    if (!position) {
      console.error('Current position is not available');
      return;
    }
    
    const lat:number = position.coords.latitude;
    const lng:number = position.coords.longitude;

    const body = {
        origin: [lat,lng],
        destination: [this.lastPin?.lat,this.lastPin?.lng],
        preferences: {
          "curv_weight": this.curveToggled ? 2.0 : 1.0,
          "speed_weight": this.speedToggled ? 2.0 : 1.0,
          "traffic_weight": this.lightToggled ? 2.0 : 1.0,
          "weather_weight": this.weatherToggled ? 2.0 : 1.0
        }
    };
    
    // request to backend server
    try {

      const response = await fetch('http://10.0.2.2:8000/analyze-route',{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      
      
      this.mapComponent.displayRoutes(data);

    } catch (err){
      console.error('Could not connect to backend', err);
    }
  }
  endOptions(){this.currentView.set('end');}

  groupJoined(){
    this.display.set(false);
  }
}
