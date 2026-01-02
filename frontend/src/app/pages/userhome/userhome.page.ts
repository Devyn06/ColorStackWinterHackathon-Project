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

  //receieves signal from map component 
  onMapReady(isReady:boolean){
    if (isReady){
      this.mapReady.set(true);
    }
  }

  constructor() {
    addIcons({ addCircleOutline, peopleOutline});
  }
  ngOnInit() {
  }

  createGroup(){
    //TO DO
  }
  joinGroup(){
    //TO DO
  }
}
