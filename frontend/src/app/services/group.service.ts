import { Injectable,signal } from '@angular/core';
import {Geolocation,Position} from '@capacitor/geolocation';
@Injectable({
  providedIn: 'root',
})
export class GroupService {
  // Group code public to the entire app
  public groupCode = signal<string | null>(null);

  generateCode() {
    const newCode = Math.random().toString(36).substring(2,8).toUpperCase();
    this.groupCode.set(newCode);

    console.log("New code generated: ", newCode);

    return newCode;
  }
}
