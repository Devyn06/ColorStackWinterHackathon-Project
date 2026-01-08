import { Injectable,inject } from '@angular/core';
import { Database, ref, push} from '@angular/fire/database'; // for firebase

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
}
