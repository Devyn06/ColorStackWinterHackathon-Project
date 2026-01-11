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

  groupCode = '';

  // holds data for unsubscribeFromGroup method
  private unsubscribeFromGroup?: () => void;

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

  // holds user inputted code "writeable signal" 2 way binding
  userJoinCode = model('');

  //receieves signal from map component
  onMapReady(isReady:boolean){
    this.mapReady.set(isReady);
  }
  constructor(private router:Router,
    private groupService: GroupService,
    private locationService: LocationService,
    private trackingService: TrackingService,
    private authService: AuthService) {
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
    }

    this.endGroupListener();

    this.currentView.set('selection');
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
    }

    this.endGroupListener();

    this.currentView.set('selection');
  }

  async goBack(){
    if (this.mapComponent) {
      await this.mapComponent.clearAllFriendMarkers();
    }

    this.currentView.set('selection');
  }

  joinGroup(){this.currentView.set('join');}
  async startSession(){
    // Disable ability to join group
    await this.trackingService.disableGroupJoin(this.groupService.groupCode());

    // Change set screen
    this.currentView.set('start');
  }
}
