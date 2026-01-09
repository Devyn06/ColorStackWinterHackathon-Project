import { Component, OnInit } from '@angular/core';
import { Router} from '@angular/router';
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonMenu,
  IonMenuButton,
  IonTitle,
  IonToolbar,
  IonList,
  IonLabel,
  IonItem
} from '@ionic/angular/standalone';
@Component({
  selector: 'app-menu-screen',
  templateUrl: './menu-screen.component.html',
  styleUrls: ['./menu-screen.component.scss'],
  imports: [IonButtons, IonContent, IonHeader, IonMenu, IonMenuButton, IonTitle, IonToolbar,IonList,IonLabel,IonItem],
  
})
export class MenuScreenComponent  implements OnInit {

  constructor(private router:Router) { }

  ngOnInit() {}

  // redirects user to User Profile page
  goToUserProfile(){
    this.router.navigate(['/userProfile']);
    console.log("UserProfile");
  }

  // redirects user to Logs page
  goToLogs(){
    this.router.navigate(['/logs']);
    console.log("Logs");
  }
  
}
