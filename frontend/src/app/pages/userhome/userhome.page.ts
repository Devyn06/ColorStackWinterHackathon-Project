import { Component, OnInit, signal,model,ViewChild,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonCardContent,IonRow,IonCol,IonButton,IonIcon,IonCard,
  IonCardTitle,IonCardHeader,IonGrid,IonSpinner,IonRange,IonInput,RangeCustomEvent,IonButtons,IonToolbar,IonToggle,IonLabel,IonItem} from '@ionic/angular/standalone';
import { Component, OnInit, signal,model,ViewChild,Renderer2, ElementRef,OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonCardContent,IonRow,IonCol,IonButton,IonIcon,IonCard,
  IonCardTitle,IonCardHeader,IonGrid,IonSpinner,IonRange,IonInput,RangeCustomEvent,IonButtons,IonToolbar,IonToggle,IonLabel,IonFooter} from '@ionic/angular/standalone';
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
import {
  Database,
  ref,
  push,
  set,
  serverTimestamp,
  remove,
  get,
  child,
  DataSnapshot,
  onValue,
  onDisconnect } from '@angular/fire/database'; // for firebase
// gets API key from file
const mapKey = environment.mapsKey;

@Component({
  selector: 'app-userhome',
  templateUrl: './userhome.page.html',
  styleUrls: ['./userhome.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule,IonCardContent,IonRow,IonCol,IonButton,
    IonIcon,IonCard,IonCardTitle,IonCardHeader,IonGrid,IonSpinner,IonRange,IonToggle, MapDisplayComponent,IonInput,IonButtons,IonToolbar,MenuScreenComponent,IonLabel,IonItem]
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
  displayMainCard = signal(true);
  
  groupCode = '';

  // holds data for unsubscribeFromGroup method
  private unsubscribeFromGroup?: () => void;

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
  currentView = signal<'selection' | 'group' | 'create' | 'join' | 'waitroom' | 'start'>('selection');

  // what the user will view changes the on screen "cards" 
  currentView = signal<'selection' | 'group' | 'create' | 'join' | 'start' |'tracking'|'end'|'lobby'>('selection');
  
  // User Codes
  userJoinCode = model('');

  groupMembers = signal<string[]>([]);
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
    document.documentElement.style.setProperty('--height', '600px');
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
      alert("Group not found. Please check the Group Code.");
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
    this.userJoinCode.set('');
    this.currentView.set("waitroom");
    document.documentElement.style.setProperty('--height', '600px');
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
        this.getGroupMembers(members);
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
    }

    this.endGroupListener();
    this.mapComponent.ngOnDestroy();
    this.currentView.set('selection');
    document.documentElement.style.setProperty('--height', '200px');
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
      this.userJoinCode.set('');
      await this.mapComponent.clearAllFriendMarkers();
    }
    this.displayMainCard.set(true);
    this.currentView.set('selection');
    document.documentElement.style.setProperty('--height', '200px');
  }

  joinGroup(){this.currentView.set('join');}
  async startSession(){
    // Disable ability to join group
    await this.trackingService.disableGroupJoin(this.groupService.groupCode());
    // Change set screen
    this.currentView.set('start');
    this.displayMainCard.set(true);
  }
  async confirm(){

    this.currentView.set('tracking');
    this.displayMainCard.set(false);

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

  async leaveRoom(){

    const uid = this.authService.getUserId();
    this.trackingService.removeUserFromGroup(uid || 'null',this.groupCode)
    this.currentView.set('group');
    this.groupService.groupCode.set(null);
    this.groupCode ='';
    document.documentElement.style.setProperty('--height', '200px');
  }

  private db = inject(Database);

  async getGroupMembers(members: any) {
    

    const membersInSync = Object.keys(members);
    console.log('members keys received:', membersInSync);
    const dbRef = ref(this.db);
    const memberList: string[] = [];

  
  const snapshot = await get(child(dbRef, `groups/${this.groupCode}/host`));
  //Check if host is still in room an if not kicks user
    if (snapshot.exists()) {
      //Finds names of all users in room
      for(const Id of membersInSync){
        const snapshot = await get(child(dbRef, `userDB/${Id}`));

        if (snapshot.exists()) {
          const member = snapshot.val();
          memberList.push(member.firstName + ' ' + member.lastName);
          console.log('member is: ' + member.firstName); // Returns major info of the group
        }
      }
      this.groupMembers.set(memberList);
    }
    else{
      this.leaveRoom();
      alert("Room Closed.");
    }
  }
      
}
