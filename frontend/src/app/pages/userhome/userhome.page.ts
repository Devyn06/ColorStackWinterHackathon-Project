import { Component, OnInit, signal,model,ViewChild,inject,Renderer2, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonCardContent,IonRow,IonCol,IonButton,IonIcon,IonCard,
  IonCardTitle,IonCardHeader,IonGrid,IonSpinner,IonRange,IonInput,IonButtons,IonToolbar,ToastController,IonToggle,IonList,IonLabel,IonItem,IonFooter} from '@ionic/angular/standalone';
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
  imports: [IonContent, CommonModule, FormsModule,IonCardContent,IonRow,IonCol,IonButton,IonList,
    IonIcon,IonCard,IonCardTitle,IonCardHeader,IonGrid,IonSpinner,IonRange,IonToggle, MapDisplayComponent,IonInput,IonButtons,IonToolbar,MenuScreenComponent,IonLabel,IonFooter,IonItem]
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
  gameStarted = signal(false);

  // holds data for unsubscribeFromGroup method
  private unsubscribeFromGroup?: () => void;
  private unsubscribeSelectedRoute?: () => void;

  // live time 
  currentTime = signal<string>('');
  private timer: any;

  // what the user will view changes the on screen "cards" 
  currentView = signal<'selection' | 'group' | 'create' | 'join' |'waitroom'| 'start' |'tracking'|'end'|'lobby'>('selection');
  
  // User Codes
  userJoinCode = model('');

  groupMembers = signal<string[]>([]);
  // routes fetched from server and selected index for UI
  routes: any[] = [];
  selectedRouteIndex: number | null = null;

  // AI prompt (optional) returned from backend for display in a toast
  aiPrompt: string | null = null;

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
    private renderer: Renderer2,
    private toastController: ToastController) {
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
    this.listenForGameStart();

  }

  startGroupListener() {
    // Get code
    const code = this.groupService.groupCode();
    if (!code) return;

    // Start member listener loop
    this.unsubscribeFromGroup = this.trackingService.listenToGroup(code, (members) => {
      if (this.mapComponent && members) {
        this.mapComponent.updateMemberMarkers(members);
      }
      this.getGroupMembers(members);
    });

    // Start listening for a selected route published by the host (expects a lite object with polyline)
    this.unsubscribeSelectedRoute = this.trackingService.listenToSelectedRoute(code, async (route) => {
      if (route && typeof route === 'object' && route.polyline) {
        // Draw just the encoded polyline string on the map for members
        if (this.mapComponent) {
          await this.mapComponent.drawPolyline(route.polyline);
        }

        // Switch to tracking mode and hide the main card
        this.currentView.set('tracking');
        this.displayMainCard.set(false);

        // Store minimal local representation for UI
        this.routes = [{ polyline: route.polyline, summary: route.summary || '', timestamp: route.timestamp || Date.now() }];
        this.selectedRouteIndex = 0;
      }
    });
  }

  endGroupListener() {
    if (this.unsubscribeFromGroup) {
      this.unsubscribeFromGroup(); // stop member updates!
      this.unsubscribeFromGroup = undefined;
    }
    if (this.unsubscribeSelectedRoute) {
      this.unsubscribeSelectedRoute(); // stop selected-route updates!
      this.unsubscribeSelectedRoute = undefined;
    }
    if (this.unsubscribeFromJoinable) {
      this.unsubscribeFromJoinable();
      this.unsubscribeFromJoinable = undefined;
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
    this.gameStarted.set(true);
    document.documentElement.style.setProperty('--height', '200px');

    this.listenForGameStart();

  }

  // Only used to MANAGE API CALLS remove for demo for smoother updates (reroute only)
  private lastApiCallTime = 0;
  private readonly API_COOLDOWN = 10000;  //10s
  private readonly REROUTE_THRESHOLD = 0.8; //change to .1 for demo 

  async confirm() {
    // Ensure routes have been fetched and a route is selected
    if (!this.routes || this.routes.length === 0) {
      await this.fetchRoutes();
    }

    if (!this.routes || this.routes.length === 0) return;

    if (this.selectedRouteIndex === null) this.selectedRouteIndex = 0;

    const selected = this.routes[this.selectedRouteIndex];

    // Prepare a lightweight object to send to Firebase to avoid large payloads
    const lite = {
      polyline: selected.polyline,
      summary: selected.summary || '',
      timestamp: Date.now()
    };

    // If in a group, publish the lite selected route so members will display it
    const code = this.groupService.groupCode();
    if (code) {
      await this.trackingService.setSelectedRoute(code, lite);
    }

    // Host should still use the full object locally for display
    if (this.mapComponent) {
      await this.mapComponent.displayRoute(selected);
    }

    // If the backend provided an AI prompt, show it in a toast for 10 seconds
    if (this.aiPrompt) {
      try {
        const toast = await this.toastController.create({
          message: this.aiPrompt,
          duration: 10000,
          position: 'bottom',
          color: 'primary'
        });
        await toast.present();
      } catch (err) {
        console.warn('Failed to show AI prompt toast:', err);
      }
    }

    // Move into tracking view
    this.currentView.set('tracking');
    this.displayMainCard.set(false);
  }

  // Fetch routes from the server without changing the current view (used for Preview)
  async fetchRoutes() {
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

      // Support both array responses and an object { routes, explanation }
      if (Array.isArray(data)) {
        this.routes = data;
        // Try to synthesize a short AI prompt from route reasons if present
        if (data[0] && data[0].reasons) {
          this.aiPrompt = (data[0].reasons || []).slice(0,3).join('; ');
        } else {
          this.aiPrompt = null;
        }
      } else if (data && typeof data === 'object') {
        // API might return { routes: [...], explanation: '...' }
        this.routes = Array.isArray((data as any).routes) ? (data as any).routes : [];
        this.aiPrompt = (data as any).explanation || (data as any).prompt || null;
      } else {
        this.routes = [];
        this.aiPrompt = null;
      }

      if (this.mapComponent) {
        await this.mapComponent.displayRoutes(this.routes);
        if (this.routes.length > 0) {
          this.selectedRouteIndex = 0;
          await this.mapComponent.displayRoute(this.routes[0]);
        }
      }

      // Reset last API call time so we don't immediately reroute after a fresh route
      this.lastApiCallTime = Date.now();
    } catch (err) {
      console.error('Backend connection failed.', err);
    }
  }

  // Backwards compatible - still used by some places to fetch + show routes and enter tracking
  async fetchAndDrawRoute() {
    await this.fetchRoutes();
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

  // Select a particular route (index) and show it on the map
  async selectRoute(index: number) {
    if (!this.routes || index < 0 || index >= this.routes.length) return;
    this.selectedRouteIndex = index;
    await this.mapComponent.displayRoute(this.routes[index]);
  }

  // Cycle previous
  async prevRoute() {
    if (!this.routes || this.routes.length === 0) return;
    const newIndex = this.selectedRouteIndex === null ? 0 : (this.selectedRouteIndex - 1 + this.routes.length) % this.routes.length;
    await this.selectRoute(newIndex);
  }

  // Cycle next
  async nextRoute() {
    if (!this.routes || this.routes.length === 0) return;
    const newIndex = this.selectedRouteIndex === null ? 0 : (this.selectedRouteIndex + 1) % this.routes.length;
    await this.selectRoute(newIndex);
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
    this.gameStarted.set(false);
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
      // Host ended the session — send members back to selection card and clear group state
      try {
        if (this.mapComponent) {
          await this.mapComponent.clearAllFriendMarkers();
          await this.mapComponent.clearMap();
        }
      } catch (err) {
        console.warn('Failed to clear map after host ended session:', err);
      }

      // Clear group state locally
      this.groupService.groupCode.set(null);
      this.groupCode = '';
      this.endGroupListener();
      this.displayMainCard.set(true);
      this.currentView.set('selection');
      document.documentElement.style.setProperty('--height', '200px');

      alert("Room Closed.");
    }
  }

  private unsubscribeFromJoinable?: () => void;

listenForGameStart() {
  const joinableRef = ref(this.db, `groups/${this.groupCode}/joinable`);

  this.unsubscribeFromJoinable = onValue(joinableRef, snapshot => {
    if (!snapshot.exists()) return;

    const joinable = snapshot.val();

    if (!this.gameStarted() && (joinable === false || joinable === 'false')) {
      this.currentView.set('tracking');
      this.displayMainCard.set(false);
      //this.confirm();
      this.gameStarted.set(true);
      console.log('Game started for member');
    }
  });
}

      
}
