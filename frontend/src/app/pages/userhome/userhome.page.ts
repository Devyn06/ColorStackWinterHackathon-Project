import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonCardContent,IonRow,IonCol,IonButton,IonIcon,IonCard,
  IonCardTitle,IonCardHeader,IonGrid,IonSpinner} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline, peopleOutline } from 'ionicons/icons';
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
  schemas:[],
  imports: [IonContent, CommonModule, FormsModule,IonCardContent,IonRow,IonCol,IonButton,
    IonIcon,IonCard,IonCardTitle,IonCardHeader,IonGrid,IonSpinner, MapDisplayComponent]
})
export class UserhomePage implements OnInit {
  mapReady = signal(false);
  currentView = signal<'selection' | 'group' | 'create' | 'join'>('selection');
  groupCode = signal('');

  //receieves signal from map component 
  onMapReady(isReady:boolean){
    this.mapReady.set(isReady);
  }
  constructor() {
    addIcons({ addCircleOutline, peopleOutline});
  }
  ngOnInit() {
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
    //TO DO
  }
  startSession(){
    //to DO
  }
}
