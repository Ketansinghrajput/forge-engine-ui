import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { AuctionLobbyComponent } from './components/auction-lobby/auction-lobby';
import { AuctionDetail } from './components/auction-detail/auction-detail';
import { CreateAuctionComponent } from './components/create-auction/create-auction';
import { WalletComponent } from './components/wallet/wallet';
import { ProfileComponent } from './components/profile/profile';
import { RegisterComponent } from './components/register/register';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'auctions', component: AuctionLobbyComponent },
  { path: 'auction-detail/:id', component: AuctionDetail },
  { path: 'create-auction', component: CreateAuctionComponent },
  { path: 'wallet', component: WalletComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent },
];