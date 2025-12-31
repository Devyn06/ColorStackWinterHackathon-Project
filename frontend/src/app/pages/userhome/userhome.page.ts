import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonCardContent,IonRow,IonCol,IonButton,IonIcon,IonCard,IonCardTitle,IonCardHeader,IonGrid} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline, peopleOutline } from 'ionicons/icons';
@Component({
  selector: 'app-userhome',
  templateUrl: './userhome.page.html',
  styleUrls: ['./userhome.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonCardContent,IonRow,IonCol,IonButton,IonIcon,IonCard,IonCardTitle,IonCardHeader,IonGrid]
})
export class UserhomePage implements OnInit {

  constructor() {
    addIcons({ addCircleOutline, peopleOutline});
   }

  ngOnInit() {
  }
  createGroup(){
  }
  joinGroup(){

  }
}
