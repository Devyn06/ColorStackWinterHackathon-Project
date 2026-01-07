import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonInput,IonItem,IonList,IonInputPasswordToggle,
  IonText,IonButton,IonBackButton,IonButtons,NavController} from '@ionic/angular/standalone';
import { Router} from '@angular/router';
import { Database, ref, push } from '@angular/fire/database'; // for db
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth'; //for authentification


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

  private db = inject(Database);
  //Set button color
  loginButtonColor = 'primary';

  // Example job for Firebase
  testSend() {
    const testFolder = ref(this.db, 'test_jobs');

    push(testFolder, {
      message: "Testing!",
      timestamp: new Date().toISOString()
      })
    .then(() => console.log("Firebase DB Success"))
    .catch((err) => console.error('Firebase Error:', err));
  }


  // injects router
  constructor(private router:Router,private navController:NavController,private auth: Auth) { }

  ngOnInit() {
    this.testSend()
  }
  async onLogin(){
    // send userEmail and userPassword to DB, AUTHENTICATE LOGIN HERE (TEMP REDIRECTS USER TO USERHOME)
    console.log(this.userEmail);
    console.log(this.userPassword);
    // prevents back function after being logged in
    
    signInWithEmailAndPassword(this.auth, this.userEmail, this.userPassword) //Check login Credentials
    //Go to home page if correct
    .then((userCredential) => {
      console.log('Auth Success (Login):', userCredential.user);
      this.navController.navigateRoot('/userhome',{
        animated: true,
        animationDirection: 'forward'
      });
    })
    //Return an error msg
    .catch((error) => {
      console.error('Auth Error (Login):', error.message);
      this.loginButtonColor = 'danger'; //Change button color to red
    });


    
  }
  // redirects user to signup page
  goToSignUp(){
    this.router.navigate(['/signup']);
  }

}
