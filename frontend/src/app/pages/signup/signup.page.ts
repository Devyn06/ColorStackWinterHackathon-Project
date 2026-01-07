import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonItem,IonList,IonInput,IonInputPasswordToggle,IonButton,IonText,IonBackButton,IonButtons } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { Auth, createUserWithEmailAndPassword} from '@angular/fire/auth';//for auth

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonItem,IonList,IonInput,IonInputPasswordToggle,IonBackButton,IonButtons,IonText,IonButton]
})


export class SignupPage implements OnInit {
  //user info on signup
  userEmail:string = '';
  userPassword:string = '';
  confirmPassword:string = '';
  firstName:string = '';
  lastName:string ='';
  constructor(private router:Router, private auth: Auth) { }


  ngOnInit() {
  }

  onSignup(){
    console.log(this.userEmail);
    console.log(this.userPassword);
    console.log(this.firstName);
    console.log(this.lastName);
    //routes to userhomepage
    createUserWithEmailAndPassword(this.auth, this.userEmail, this.userPassword)
      .then((userCredential)=>{
        this.router.navigate(['/userhome']);
      })
      .catch((error) =>{
        console.error('Auth Error (Login):', error.message);
      });
      
    }
    
  
  
  goLogin(){
    this.router.navigate(['/login']);
  }
}
