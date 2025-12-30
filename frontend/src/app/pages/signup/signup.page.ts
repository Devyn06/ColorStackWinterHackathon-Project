import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonItem,IonList,IonInput,IonInputPasswordToggle,IonButton,IonText,IonBackButton,IonButtons } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
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
  constructor(private router:Router) { }

  ngOnInit() {
  }

  onSignup(){
    console.log(this.userEmail);
    console.log(this.userPassword);
    console.log(this.firstName);
    console.log(this.lastName);
  }
  goLogin(){
    this.router.navigate(['/login']);
  }
}
