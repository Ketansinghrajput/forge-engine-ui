(window as any).global = window; // WebSocket polyfill - Safe for StompJS
import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component'; 
import { appConfig } from './app/app.config';
// 🚀 SENSEI: Sirf ek baar bootstrap karo with appConfig
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));