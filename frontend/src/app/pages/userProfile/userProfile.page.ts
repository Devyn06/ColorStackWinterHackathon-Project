import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonInput,IonItem,IonList,IonInputPasswordToggle,
  IonText,IonButton,IonBackButton,IonButtons,NavController} from '@ionic/angular/standalone';
import { Router} from '@angular/router';
import {AuthService} from '../../services/auth.service';
import {TrackingService} from '../../services/tracking.service';

@Component({
  selector: 'app-userProfile',
  templateUrl: './userProfile.page.html',
  styleUrls: ['./userProfile.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonInput,IonItem,IonList,IonText,IonInputPasswordToggle,IonButton,IonBackButton,IonButtons]
})
export class UserProfilePage implements OnInit {
    // ALL INJECTIONS same concept as const example = inject(test);
    constructor(private router:Router, private authService: AuthService,private navController:NavController) { }

    ngOnInit() {
    }

    email = this.authService.currentUser()?.email;

    async onSignout(){
      this.authService.logout();
      this.router.navigate(['/home']);
    }
}
