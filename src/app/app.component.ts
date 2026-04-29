import { Component } from '@angular/core';
// FIX: Exact import path for the child component
import { AuctionDetail } from './components/auction-detail/auction-detail';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AuctionDetail],
  templateUrl: './app.component.html'
})
export class AppComponent {
}