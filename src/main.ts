(window as any).global = window; // WebSocket polyfill - Isko sabse upar hi rakhna

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component'; // Ye path tere file structure se match karta hai
import { appConfig } from './app/app.config';
bootstrapApplication(AppComponent, appConfig)

bootstrapApplication(AppComponent)
  .catch((err) => console.error(err));