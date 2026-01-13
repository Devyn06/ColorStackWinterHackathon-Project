import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA,ViewChild,ElementRef,output} from '@angular/core';
import { ToastController} from '@ionic/angular/standalone';
import { GoogleMap,Polyline,LatLngBounds } from '@capacitor/google-maps';
import { environment } from '../../../environments/environment';
import {LocationService} from '../../services/location.service';
import {TrackingService} from '../../services/tracking.service';
import {AuthService} from '../../services/auth.service';
import {GroupService} from '../../services/group.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as polyline from '@mapbox/polyline';
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

  private currentRoutePoints: { lat: number, lng: number }[] = [];
  private activeMainPolyline: any = null; // To store the primary blue route config

  private markerIds: string[] = []; // for the current user's marker
  private friendMarkers: Map<string, string> = new Map();
  private routePolylineIds: string[]=[]; // Track Route Lines
  private cameraWatcherId: string | null = null; 

  // output values sent to userhome page
  mapReady = output<boolean>();

  // tells userhome location of pin
  pinDropped = output<{lat: number, lng: number}>();

  // emits the current minimum distance from user to route when updated
  distanceToLine = output<number>();

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

  // Distance in KM after which the primary polyline should be trimmed only used when immediate_trim = false
  private readonly TRIM_DISTANCE_KM = 0.001; // 1 m
  // When true, trim as soon as user advances
  private readonly IMMEDIATE_TRIM = true;
  // Tracks how far along the original route we've trimmed already
  private lastTrimDistanceKm = 0;

  //life cycle hooks
  ngOnInit() {}
  async ngAfterViewInit(){
    await this.initMapAtCurrentLocation();
  }

  async ngOnDestroy(){
      // if (this.newMap){await this.newMap.destroy();}
      if (this.routePolylineIds.length > 0){
        await this.newMap.removePolylines(this.routePolylineIds);
      }
      await this.locationService.stopWatching();
  }

  async clearMap(){
    if (this.routePolylineIds.length > 0){
        await this.newMap.removePolylines(this.routePolylineIds);
        this.routePolylineIds = [];
    }

    // Clear route tracking data
    this.currentRoutePoints = []; 
    this.activeMainPolyline = null; 
    await this.locationService.stopWatching();
  }

  @ViewChild('mapElement') mapRef!: ElementRef<HTMLElement>;
  newMap!: GoogleMap;

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
        this.cameraWatcherId = await this.locationService.watchPosition(async (pos) => {
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

            // Also update route progress here so map component controls trimming and emits distance
            try {
              if (this.currentRoutePoints.length >= 2) {
                await this.updateRouteProgress(pos.coords.latitude, pos.coords.longitude, this.currentRoutePoints);
              }
            } catch (err) {
              console.error('Error updating route progress from camera watcher:', err);
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

    async displayRoutes(routes:any[], selectedIndex: number | null = null){
      // checks for previous routes and if map is loaded
      if (!this.newMap || !routes || routes.length == 0) return;

      if (this.routePolylineIds.length > 0){
        await this.newMap.removePolylines(this.routePolylineIds);
        this.routePolylineIds = [];
      }

      // stores configured polylines
      const polylinesConfig: Polyline[] = [];
      const allPoints: {lat:number; lng: number} []=[];

      routes.forEach((route,index) =>{
        const decodedPath = polyline.decode(route.polyline);
        const points = decodedPath.map( point => ({
          lat: point[0],
          lng: point[1]
        }));

        // Collect all points for combined view
        allPoints.push(...points);

        const isSelected = selectedIndex !== null && index === selectedIndex;
        if (isSelected){
          // set the selected route as the current route for tracking
          this.currentRoutePoints = [...points];
          this.activeMainPolyline = {
            strokeColor: '#3880ff',
            strokeWeight: 6,
            strokeOpacity: 1.0,
            zIndex: 10
          };
        }

        // Route config : selected route is blue rest are red
        const polyConfig = {
          path: points,
          strokeColor: isSelected ? '#3880ff' : '#ff0000',
          strokeWeight: isSelected ? 6 : 4,
          strokeOpacity: isSelected ? 1.0 : 0.5,
          zIndex: isSelected ? 10 : 1
        };
        polylinesConfig.push(polyConfig);
      });

      this.routePolylineIds = await this.newMap.addPolylines(polylinesConfig);

      if (selectedIndex !== null){
        const selectedPoints = polyline.decode(routes[selectedIndex].polyline).map(p => ({lat: p[0], lng: p[1]}));
        await this.focusRoute(selectedPoints);
      } else {
        await this.focusRoute(allPoints);
      }
    }

    // Displays a single selected route (used when user selects a route from parent)
    async displayRoute(route:any){
      if (!this.newMap || !route) return;

      if (this.routePolylineIds.length > 0){
        await this.newMap.removePolylines(this.routePolylineIds);
        this.routePolylineIds = [];
      }

      const decodedPath = polyline.decode(route.polyline);
      const points = decodedPath.map( p => ({lat: p[0], lng: p[1]}));

      // set selected route for tracking
      this.currentRoutePoints = [...points];
      this.activeMainPolyline = {
        strokeColor: '#3880ff',
        strokeWeight: 6,
        strokeOpacity: 1.0,
        zIndex: 10
      };

      const polyConfig = [{
        path: points,
        strokeColor: '#3880ff',
        strokeWeight: 6,
        strokeOpacity: 1.0,
        zIndex: 10
      }];

      this.routePolylineIds = await this.newMap.addPolylines(polyConfig);
      await this.focusRoute(points);
    }

    // Draw an encoded polyline string directly (used by group members when receiving selected lite route)
    public async drawPolyline(encodedPath: string) {
      if (!this.newMap || !encodedPath) return;

      // Remove existing polylines
      if (this.routePolylineIds.length > 0) {
        await this.newMap.removePolylines(this.routePolylineIds);
        this.routePolylineIds = [];
      }

      // Decode encoded polyline
      const decoded = polyline.decode(encodedPath).map(p => ({ lat: p[0], lng: p[1] }));

      // Set as current route points for progress tracking
      this.currentRoutePoints = [...decoded];
      this.activeMainPolyline = {
        strokeColor: '#3880ff',
        strokeWeight: 6,
        strokeOpacity: 1.0,
        zIndex: 10,
        geodesic: true
      };

      const polyConfig = [{
        path: decoded,
        strokeColor: '#3880ff',
        strokeWeight: 6,
        strokeOpacity: 1.0,
        zIndex: 10,
        geodesic: true
      }];

      this.routePolylineIds = await this.newMap.addPolylines(polyConfig);
      await this.focusRoute(decoded);
    }

    // creates bounds for re centering view for a single selected route or combined points
    private async focusRoute(points: { lat: number, lng: number}[]){
      
      if (points.length === 0) return;
      
      // filters coordinate points
      const lats = points.map(p=>p.lat);
      const lngs = points.map(p=>p.lng);
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      // adds padding so route doesnt fill whole screen
      const latPadding = (maxLat - minLat) * 0.2;
      const lngPadding = (maxLng - minLng) * 0.2;

      const bounds : LatLngBounds = {
        southwest:  {lat: minLat-latPadding, lng: minLng - lngPadding},
        northeast: {lat: maxLat + latPadding, lng: maxLng + lngPadding}
      }as any;

      await this.newMap.fitBounds(bounds);
    }

    // Updates live selected route progress; accepts an explicit route polyline so we only operate on the selected route
    async updateRouteProgress(uLat: number, uLng: number, routePoints?: {lat:number,lng:number}[]): Promise<number> {
      const pts = routePoints && routePoints.length ? routePoints : this.currentRoutePoints;
      if (!pts || pts.length < 2) return 0;

      // Use segment projection to get a precise closest point and distance along route
      const closest = this.getClosestPointOnRoute(uLat, uLng, pts);
      const minDistance = closest.distanceKm;
      const distanceAlong = closest.distanceAlongKm;
      const segIndex = closest.segmentIndex;
      const projPoint = { lat: closest.lat, lng: closest.lng };

      // Small on-route threshold (20 m); separating this from reroute threshold
      const ON_ROUTE_THRESHOLD_KM = 0.02;

      if (minDistance < ON_ROUTE_THRESHOLD_KM) {
        // If we've progressed enough since last trim OR immediate trim is enabled, trim the start
        if (segIndex >= 0 && (this.IMMEDIATE_TRIM || (distanceAlong - this.lastTrimDistanceKm >= this.TRIM_DISTANCE_KM))) {
          try {
            // Build new route starting with the precise projected point
            const remaining = pts.slice(segIndex + 1);
            const newRoute = [projPoint, ...remaining];

            // Update internal selected route representation
            this.currentRoutePoints = newRoute;

            this.lastTrimDistanceKm = distanceAlong;

            // Update the visible polyline on the map
            if (this.routePolylineIds.length > 0) {
              await this.newMap.removePolylines([this.routePolylineIds[0]]);

              const newId = await this.newMap.addPolylines([{
                ...this.activeMainPolyline,
                path: this.currentRoutePoints
              }]);

              this.routePolylineIds[0] = newId[0];
            }
          } catch (error) {
            console.error('Failed to update route polyline:', error);
          }
        }
      }

      // Emit the most recent distance to parent components
      try { this.distanceToLine.emit(minDistance); } catch (err) {
        console.warn('Distance emit failed:', err);
      }

      return minDistance;
    }

    // calculates distance to update routed polyline
    private getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in KM
    }

    // (Helper to get closest point on route) Projects a point onto a segment and returns the projected point and fraction t (0..1) 
    private projectPointToSegment(uLat: number, uLng: number, a: {lat:number,lng:number}, b: {lat:number,lng:number}){
      // Treat lat as y and lng as x for small-distance planar projection
      const ax = a.lng, ay = a.lat;
      const bx = b.lng, by = b.lat;
      const px = uLng, py = uLat;

      const vx = bx - ax, vy = by - ay;
      const wx = px - ax, wy = py - ay;
      const vlen2 = vx * vx + vy * vy;
      let t = 0;
      if (vlen2 > 0) {
        t = (wx * vx + wy * vy) / vlen2;
        t = Math.max(0, Math.min(1, t));
      }

      const projX = ax + t * vx;
      const projY = ay + t * vy;
      const distKm = this.getHaversineDistance(py, px, projY, projX);

      return { lat: projY, lng: projX, t, distKm };
    }

    // Find closest projected point on a provided route (or the currentRoutePoints if none provided), returns distance to route and distance along route
    private getClosestPointOnRoute(uLat: number, uLng: number, routePoints?: {lat:number,lng:number}[]){
      const points = routePoints && routePoints.length ? routePoints : this.currentRoutePoints;

      let best = {
        distanceKm: Infinity,
        lat: 0,
        lng: 0,
        distanceAlongKm: 0,
        segmentIndex: -1,
        t: 0
      };

      // cumulative distance from route start to beginning of current segment
      let cumulative = 0;
      for (let i = 0; i < points.length - 1; i++){
        const a = points[i];
        const b = points[i + 1];
        const segLen = this.getHaversineDistance(a.lat, a.lng, b.lat, b.lng);

        const proj = this.projectPointToSegment(uLat, uLng, a, b);
        const distanceAlong = cumulative + segLen * proj.t;

        if (proj.distKm < best.distanceKm){
          best = {
            distanceKm: proj.distKm,
            lat: proj.lat,
            lng: proj.lng,
            distanceAlongKm: distanceAlong,
            segmentIndex: i,
            t: proj.t
          };
        }
        cumulative += segLen;
      }
      return best;
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
