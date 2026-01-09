import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.page').then( m => m.HomePage)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup.page').then( m => m.SignupPage)
  },
  {
    path: 'userhome',
    loadComponent: () => import('./pages/userhome/userhome.page').then( m => m.UserhomePage)
  },
  {
    path: 'userProfile',
    loadComponent: () => import('./pages/userProfile/userProfile.page').then( m => m.UserProfilePage)
  },
  {
    path: 'logs',
    loadComponent: () => import('./pages/logs/logs.page').then( m => m.LogsPage)
  }
];
