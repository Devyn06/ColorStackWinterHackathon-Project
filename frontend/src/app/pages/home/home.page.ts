import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent,IonButton,IonGrid,IonRow,IonCol} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonContent,RouterLink,CommonModule, FormsModule,IonButton,IonGrid,IonRow,IonCol]
})
export class HomePage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
