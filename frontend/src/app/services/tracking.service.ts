import { Injectable,inject } from '@angular/core';
import {
  Database,
  ref,
  push,
  set,
  serverTimestamp,
  remove,
  get,
  child,
  DataSnapshot,
  onValue,
  onDisconnect } from '@angular/fire/database'; // for firebase

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
  async saveLocationToFirebase(userId: string, position: any, groupId: string | null) {
    try {
      // Write for every individual user
      const path = `location/${userId}`;
      const trackingRef = ref(this.db, path);

      await set(trackingRef, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });

      // Write if in a group
      if (groupId) {
        const groupPath = `groups/${groupId}/members/${userId}`;
        const groupRef = ref(this.db, groupPath);

        await set(groupRef, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      }

      console.log("Location saved!")
    } catch (e) {
      console.error("Firebase error: ", e);
    }
  }

  // Group Creation
  async createGroupInFirebase(userId: string, groupId: string, position: any) {
    try {
      console.log("Group created!")
    } catch(e) {
      console.error("Firebase error: ", e);
    }
    const path = `groups/${groupId}`;
    const trackingRef = ref(this.db, path);

    await set(trackingRef, {
      members: {
        [userId]: {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
      },
      host: userId,
      joinable: true,
      destination: {
        lat: 0,
        lng: 0
      }
    })
  }

  async removeGroupFromFirebase(groupId: string | null) {
    try {
      if (groupId) {
        const path = `groups/${groupId}`;
        const trackingRef = ref(this.db, path);

        await remove(trackingRef);

        console.log("Group removed!");
      }
      else {
        console.log("Group failed to remove!");
      }
    } catch (e) {
      console.error("Firebase error: ", e);
    }
  }

  async removeUserFromGroup(userId: string, groupId: string | null) {
    try {
      if (groupId) {
        const path = `groups/${groupId}/members/${userId}`;
        const trackingRef = ref(this.db, path);

        await remove(trackingRef);

        console.log("User removed!");
      }
      else {
        console.log("Group does not exist!");
      }
    } catch (e) {
      console.error("Firebase error: ", e);
    }
  }

  async disableGroupJoin(groupId: string | null) {
    try {
      if (groupId) {
        const path = `groups/${groupId}/joinable`;
        const trackingRef = ref(this.db, path);

        await set(trackingRef, false);

        console.log("Group closed! No new members can join.");
      }
      else {
        console.log("Group ID is unavailable");
      }
    } catch (e) {
      console.error("Firebase error: ", e);
    }
  }

  async checkGroupStatus(groupId: string) {
    const dbRef = ref(this.db);

    // Look specifically for the group and its joinable status
    const snapshot = await get(child(dbRef, `groups/${groupId}`));

    if (snapshot.exists()) {
      return snapshot.val(); // Returns major info of the group
    }
    return null;
  }

  // Set the selected route for the group. Any member can listen to this path to get the chosen route
  async setSelectedRoute(groupId: string | null, route: any) {
    try {
      if (!groupId) throw new Error('Group ID unavailable');
      const routeRef = ref(this.db, `groups/${groupId}/selectedRoute`);
      await set(routeRef, route);
      console.log('Selected route set for group', groupId);
    } catch (e) {
      console.error('Firebase error setting selected route: ', e);
    }
  }

  // Listen for a selected route for a group; returns the unsubscribe function
  listenToSelectedRoute(groupId: string, callback: (route: any) => void) {
    const selRef = ref(this.db, `groups/${groupId}/selectedRoute`);

    const unsubscribe = onValue(selRef, (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback(null);
      }
    });

    return unsubscribe;
  }

  // Listens to group members to check for changes in location
  listenToGroup(groupId: string, callback: (members: any) => void) {
    const membersRef = ref(this.db, `groups/${groupId}/members`);

    // This stays open and listens for changes
    const unsubscribe = onValue(membersRef, (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback({}); // Group might have been deleted
      }
    });

    return unsubscribe; // We return this so we can stop listening later
  }

  // Functions to cut from DB on disconnect: remove location, group, and member of group respectively
  async cutLocationOnDisconnect(userId: string) {
    const locationRef = ref(this.db, `location/${userId}`);

    await onDisconnect(locationRef).remove();

    console.log("OnDisconnect hook registered for user ", userId);
  }

  async cutGroupOnDisconnect(groupId: string) {
    const groupRef = ref(this.db, `groups/${groupId}`);

    await onDisconnect(groupRef).remove();

    console.log("OnDisconnect hook registered for group ", groupId);
  }

  async removeOnDisconnect(groupId: string, userId: string) {
    const memberRef = ref(this.db, `groups/${groupId}/members/${userId}`);

    // Set up instruction
    await onDisconnect(memberRef).remove();

    console.log("OnDisconnect hook registered for: ", userId);
  }
}
