import { Injectable,inject,signal } from '@angular/core';
import { 
  Auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from '@angular/fire/auth'; //for authentification
import {Router} from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // injections
  private auth = inject(Auth);
  private router = inject(Router);

  //instance variable to hold loggedin user
  public currentUser = signal<User | null>(null);
  
  constructor (){
    //keeps user logged in (runs with app startup)
    onAuthStateChanged(this.auth,(user) => {
      if(user){
        console.log('Session Restored');
        this.currentUser.set(user);
      }else{
        this.currentUser.set(null);
      }
    })    
  }
  //return boolean for login page
  async login(userEmail:string,userPassword:string):Promise <boolean>{
    try {
      const credentials = await signInWithEmailAndPassword(this.auth,userEmail,userPassword);
      //stores userID
      this.currentUser.set(credentials.user);
      console.log('Auth Success (Login):',credentials.user);
      return true;
    }catch (error){
      console.error('Authentication Failed',error);
      return false;
    }
  }

  async signup(email:string,pass:string):Promise<boolean>{
    try{
      const credentials = await createUserWithEmailAndPassword(this.auth,email, pass);
      this.currentUser.set(credentials.user);
      return true;
    }catch(error){
      console.error('Auth Error (Login):', error);
      return false;
    }
  }

  async logout(){
    await signOut(this.auth);
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  getUserId(){
    // gets users unique ID
    return this.currentUser()?.uid || null;
  }

}
