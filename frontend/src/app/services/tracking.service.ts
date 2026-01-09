import { Injectable,inject } from '@angular/core';
import { Database, ref, push, set, serverTimestamp } from '@angular/fire/database'; // for firebase

@Injectable({
  providedIn: 'root',
})
export class TrackingService {

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

  // Save a User's Location to Firebase
  async saveLocationToFirebase(userId: string, position: any) {
    try {
      const path = `users/${userId}/tracking`;
      const trackingRef = ref(this.db, path);

      const newRef = push(trackingRef);

      await set(newRef, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timestamp: position.timestamp,
        user: userId
      });

      console.log("Location saved!")
    } catch (e) {
      console.error("Firebase error: ", e);
    }
  }
}
