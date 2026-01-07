import { Component, OnInit,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonInput,IonItem,IonList,IonInputPasswordToggle,
  IonText,IonButton,IonBackButton,IonButtons,NavController} from '@ionic/angular/standalone';
import { Router} from '@angular/router';
import {AuthService} from '../../services/auth.service';
import { Database, ref, push } from '@angular/fire/database'; // for firebase
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
  loginButtonColor='Primary';
  private db = inject(Database);

  // Example job for Firebase
  testSend() {
    const testFolder = ref(this.db, 'test_jobs');

    push(testFolder, {
      message: "Testing!",
      timestamp: new Date().toISOString()
      })
    .then(() => console.log("Firebase Success"))
    .catch((err) => console.error('Firebase Error:', err));
  }


  // injects router
  constructor(private router:Router,private navController:NavController,private authService:AuthService) { }

  ngOnInit() {
    // this.testSend()
  }
  async onLogin(){
    const success = await this.authService.login(this.userEmail,this.userPassword)
    if (success){
      this.navController.navigateRoot('/userhome',{
        animated: true,
        animationDirection: 'forward'
      });
    }
    else{
      this.loginButtonColor = 'danger'; //Change button color to red
    }
  }
  // redirects user to signup page
  goToSignUp(){
    this.router.navigate(['/signup']);
  }

}
