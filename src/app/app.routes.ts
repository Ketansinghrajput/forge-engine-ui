import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';// app.routes.ts
import { AuctionDetailComponent } from './components/auction-detail/auction-detail';
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'auctions', component: AuctionDetailComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' } // 🚀 SENSEI: Automatic redirect
];