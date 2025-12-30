import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonInput,IonItem,IonList,IonInputPasswordToggle,IonText,IonButton,IonBackButton,IonButtons} from '@ionic/angular/standalone';
import { Router} from '@angular/router';
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonInput,IonItem,IonList,IonText,IonInputPasswordToggle,IonButton,IonBackButton,IonButtons]
})
export class LoginPage implements OnInit {
  // holds user info for login
  userEmail:string = ''
  userPassword:string = ''

  // injects router
  constructor(private router:Router) { }

  ngOnInit() {
  }
  onLogin(){
    // send userEmail and userPassword to DB
    console.log(this.userEmail);
    console.log(this.userPassword);
  }
  
  goToSignUp(){
    this.router.navigate(['/signup']);
  }
 
}
