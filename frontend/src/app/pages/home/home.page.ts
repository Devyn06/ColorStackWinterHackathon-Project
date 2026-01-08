import { Component, OnInit,effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent,IonButton,IonGrid,IonRow,IonCol,NavController} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import {AuthService} from '../../services/auth.service';
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonContent,RouterLink,CommonModule, FormsModule,IonButton,IonGrid,IonRow,IonCol]
})
export class HomePage implements OnInit {

  constructor(private authService:AuthService, private navController:NavController) {
    //listens to global actions, if user closes app it checks 
    //if theres been a user logged and automatically direct them to the userhome
    effect(()=>{
      if(this.authService.currentUser()){
        this.navController.navigateRoot('/userhome',{animated:false});
      }
    });
   }

  ngOnInit() {
  }

}
