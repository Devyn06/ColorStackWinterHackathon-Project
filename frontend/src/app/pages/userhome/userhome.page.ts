import { Component, OnInit, signal,model,ViewChild,Renderer2, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonCardContent,IonRow,IonCol,IonButton,IonIcon,IonCard,
  IonCardTitle,IonCardHeader,IonGrid,IonSpinner,IonRange,IonInput,IonButtons,IonToolbar,IonToggle,IonLabel,IonFooter} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline, peopleOutline, arrowBack,warningOutline} from 'ionicons/icons';

// API keys
import { environment } from '../../../environments/environment';

// impor to display the map
import { MapDisplayComponent } from '../../components/map-display/map-display.component';
import { MenuScreenComponent } from '../../components/menu-screen/menu-screen.component';
import { Keyboard } from '@capacitor/keyboard';
import { Router} from '@angular/router';
import { GroupService } from '../../services/group.service';
import {LocationService} from '../../services/location.service';
import {TrackingService} from '../../services/tracking.service';
import {AuthService} from '../../services/auth.service';
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
  private routeWatcherId?: string | null = null;
  // holds all toggles for each factor
  speedToggled:boolean = false;
  curveToggled:boolean = false;
  weatherToggled:boolean = false;
  lightToggled:boolean = false;
  
  pinCheck = signal(true);
  displayMainCard = signal(true);
  
  groupCode = '';

  // holds data for unsubscribeFromGroup method
  private unsubscribeFromGroup?: () => void;

  // live time 
  currentTime = signal<string>('');
  private timer: any;

  // what the user will view changes the on screen "cards" 
  currentView = signal<'selection' | 'group' | 'create' | 'join' | 'start' |'tracking'|'end'|'lobby'>('selection');
  
  // User Codes
  userJoinCode = model('');

  //receieves signal from map component
  onMapReady(isReady:boolean){
    this.mapReady.set(isReady);
  }
  
  constructor(private router:Router,
    private groupService: GroupService,
    private locationService: LocationService,
    private trackingService: TrackingService,
    private authService: AuthService,
    private el: ElementRef,
    private renderer: Renderer2) {
    addIcons({ addCircleOutline, peopleOutline,arrowBack,warningOutline});
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    Keyboard.removeAllListeners();
    if (this.routeWatcherId){
      this.locationService.stopWatching();
      this.routeWatcherId = null;
    }
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
    this.pinCheck.set(false);
  }


  async createGroup(){
    // Creates group code for user
    const code = this.groupService.generateCode();
    this.groupCode = code;

    // Gets data needed for Firebase
    const userId = await this.authService.getUserId();
    const position = this.locationService.currentPosition();

    // If all valid, write to database
    if (userId && position) {
      this.trackingService.createGroupInFirebase(userId, code, position);
    }
    else {
      console.error("Missing data: ", { code, userId, position });
    }

    // Start listener for new pins!
    this.startGroupListener();

    // Start onDisconnect event
    if (userId) {
      this.trackingService.removeOnDisconnect(this.groupCode, userId);
    }
    this.trackingService.cutGroupOnDisconnect(this.groupCode); // also remove group if connection is lost

    //changes users view
    this.currentView.set('create');
  }
  async attemptJoin() {
    const code = this.userJoinCode().toUpperCase().trim(); // Clean the input up

    // If null, just return
    if (!code) {
      return;
    }

    const groupData = await this.trackingService.checkGroupStatus(code);

    // No group found
    if (!groupData) {
      alert("Group not found. Please check the code.");
      return;
    }
    // Group is closed (unjoinable)
    if (groupData.joinable == false) {
      alert("Sorry, this group has already begun!");
      return;
    }

    // Input is valid, let's join!
    // Gets data needed for Firebase
    const userId = await this.authService.getUserId();
    const position = this.locationService.currentPosition();

    // Update group code internally
    this.groupService.groupCode.set(code);
    this.groupCode = code;

    // Add to members list on firebase
    if (userId && position) {
      await this.trackingService.saveLocationToFirebase(userId, position, code);
    }

    // Start listener for new pins!
    this.startGroupListener();
    // Start onDisconnect event
    if (userId) {
      this.trackingService.removeOnDisconnect(this.groupCode, userId);
    }

    // If valid, move to the next area! TBD
    // this.currentView.set("SOMETHING");
  }

  startGroupListener() {
    // Get code
    const code = this.groupService.groupCode();
    if (!code) return;

    // Start listener loop
    this.unsubscribeFromGroup = this.trackingService.listenToGroup(code, (members) => {
      if (this.mapComponent && members) {
        this.mapComponent.updateMemberMarkers(members);
        }
    });
  }

  endGroupListener() {
    if (this.unsubscribeFromGroup) {
      this.unsubscribeFromGroup(); // stop updates!
      this.unsubscribeFromGroup = undefined;
      }
  }

  // Card routes (what user can see)
  selectGroup(){this.currentView.set('group');}

  // Going back as a host in a group
  async goBackHost() {
    // Remove group from firebase and get rid of group code
    await this.trackingService.removeGroupFromFirebase(this.groupService.groupCode());
    this.groupService.groupCode.set(null);
    this.groupCode = '';

    if (this.mapComponent) {
      await this.mapComponent.clearAllFriendMarkers();
      await this.mapComponent.clearMap();
    }

    this.endGroupListener();
    this.currentView.set('selection');
    this.displayMainCard.set(true);
  }

  // Going back as a member of a group
  async goBackMember() {
    // Get relevant firebase data
    const userId = await this.authService.getUserId();
    // If currently a member of a group, remove them
    if (userId && this.groupCode != '') {
      await this.trackingService.removeUserFromGroup(userId, this.groupService.groupCode());
    }

    this.groupService.groupCode.set(null);
    this.groupCode = '';

    if (this.mapComponent) {
      await this.mapComponent.clearAllFriendMarkers();
      await this.mapComponent.clearMap();
    }

    this.endGroupListener();

    this.displayMainCard.set(true);
    this.currentView.set('selection');
  }

  async goBack(){
    if (this.mapComponent) {
      await this.mapComponent.clearAllFriendMarkers();
    }
    this.displayMainCard.set(true);
    this.currentView.set('selection');
  }

  joinGroup(){this.currentView.set('join');}

  async startSession(){
    // Disable ability to join group
    await this.trackingService.disableGroupJoin(this.groupService.groupCode());
    // Change set screen
    this.currentView.set('start');
    this.displayMainCard.set(true);
  }

  // Only used to MANAGE API CALLS remove for demo for smoother updates (reroute only)
  private lastApiCallTime = 0;
  private readonly API_COOLDOWN = 10000;  //10s
  private readonly REROUTE_THRESHOLD = 0.8; //change to .1 for demo 

  async confirm() {

    this.currentView.set('tracking');
    this.displayMainCard.set(false);

    // Calls Server for routes
    await this.fetchAndDrawRoute();

    // Route progress and off-route detection come from MapDisplayComponent

}

  async fetchAndDrawRoute() {
    // Update the timestamp so we track the call
    this.lastApiCallTime = Date.now();

    const position = this.locationService.currentPosition();
    if (!position || !this.lastPin) return;

    const body = {
      origin: [position.coords.latitude, position.coords.longitude],
      destination: [this.lastPin.lat, this.lastPin.lng],
      preferences: {
        "curv_weight": this.curveToggled ? 2.0 : 1.0,
        "speed_weight": this.speedToggled ? 2.0 : 1.0,
        "traffic_weight": this.lightToggled ? 2.0 : 1.0,
        "weather_weight": this.weatherToggled ? 2.0 : 1.0
      }
    };
    try {
      const response = await fetch('http://10.0.2.2:8000/analyze-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      await this.mapComponent.displayRoutes(data);

      // Reset last API call time so we don't immediately reroute after a fresh route
      this.lastApiCallTime = Date.now();
    } catch (err) {
      console.error('Backend connection failed.', err);
    }
  }

  // Called from template when MapDisplayComponent emits distance updates
  async onDistanceToLine(distanceToLine: number) {
    const now = Date.now();

    if (distanceToLine > this.REROUTE_THRESHOLD) {
      if (now - this.lastApiCallTime > this.API_COOLDOWN) {
        console.warn('Off route detected (via map). Triggering Reroute.');
        this.lastApiCallTime = now;
        await this.fetchAndDrawRoute();
      } else {
        console.log('Off route, but waiting for API cooldown...');
      }
    }
  }

  endOptions(){this.currentView.set('end');}

  groupJoined(){
    this.displayMainCard.set(false);
  }

  updateTime() {
    const now = new Date();
    this.currentTime.set(now.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }));
  }
}
