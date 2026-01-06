import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {}
  async ngOnInit(){
    await this.initializeApp();
  }
  async initializeApp() {
    if (Capacitor.isNativePlatform()) {
      try {
        // Show status bar
        await StatusBar.show();
        // Keep overlay true for proper spacing
        await StatusBar.setOverlaysWebView({ overlay: true });
        // Make status bar transparent with dark text
        await StatusBar.setStyle({ style: Style.Light });
      } catch (error) {
        console.error('Error configuring status bar:', error);
      }
    }
  }
}
