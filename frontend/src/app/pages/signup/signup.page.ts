import { Component,inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonItem,IonList,IonInput,IonInputPasswordToggle,IonButton,IonText,IonBackButton,IonButtons,NavController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import {AuthService} from '../../services/auth.service';
import { Database, ref, set } from '@angular/fire/database'; // for firebase
@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonItem,IonList,IonInput,IonInputPasswordToggle,IonBackButton,IonButtons,IonText,IonButton]
})


export class SignupPage implements OnInit {
  private db = inject(Database);

  // Example job for Firebase

  //user info on signup
  userEmail:string = '';
  userPassword:string = '';
  confirmPassword:string = '';
  firstName:string = '';
  lastName:string ='';

  // ALL INJECTIONS same concept as const example = inject(test);
  constructor(private router:Router, private auth: AuthService,private navController:NavController) { }
  

  ngOnInit() {
  }

  async onSignup(){
    
    const success = await this.auth.signup(this.userEmail,this.userPassword);
    if (success){
      this.navController.navigateRoot('/userhome',{
        animated: true,
        animationDirection: 'forward'
      });

      set(ref(this.db,`userDB/${this.auth.getUserId()}`),{
        firstName: this.firstName,
        lastName: this.lastName,
      })
      .then(() => console.log("Firebase Success"))
      .catch((err) => console.error('Firebase Error:', err));

    }


  }
  
  goLogin(){
    this.router.navigate(['/login']);
  }
}
