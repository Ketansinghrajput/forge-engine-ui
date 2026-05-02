import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-auction-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './auction-detail.html',
  styleUrl: './auction-detail.css'
})
export class AuctionDetail implements OnInit, OnDestroy {
  auctionId: number = 1;

  currentBid: number = 0;
  availableFunds: number = 0;
  highestBidder: string = 'Loading engine...';
  auctionTitle: string = '';
  auctionDescription: string = '';
  auctionRef: string = '';
  feed: any[] = [];

  remainingTime: string = '';
  isUrgent: boolean = false;
  endTime: Date = new Date(Date.now() + 5000000);

  isDropdownOpen: boolean = false;
  isBidding: boolean = false;
  private wsSubscription!: Subscription;
  private timerId: any;

  constructor(
    public wsService: WebsocketService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  get userInitials(): string {
    const email = localStorage.getItem('userEmail') || '';
    return email.slice(0, 2).toUpperCase();
  }

  get userName(): string {
    const email = localStorage.getItem('userEmail') || '';
    return email.split('@')[0];
  }

  get userEmail(): string {
    return localStorage.getItem('userEmail') || 'bidder@forge.com';
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    this.router.navigate(['/login']);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.auctionId = Number(id) || 1;
    this.auctionRef = `#FORGE-LOT-${this.auctionId}`;

    this.loadInitialState();

    this.updateCountdown();
    this.timerId = setInterval(() => {
      this.updateCountdown();
      this.cdr.detectChanges();
    }, 1000);

    try {
      this.wsService.connect(this.auctionId); // 👈 dynamic auctionId
      this.wsSubscription = this.wsService.updates$.subscribe((msg: any) => {

        if (this.feed.length > 0 && this.feed[0].newPrice === msg.newPrice) {
          return;
        }

        const newLogEntry = {
          newPrice: msg.newPrice,
          bidderName: msg.bidderName,
          bidder: msg.bidder,
          timestamp: new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
          })
        };

        this.currentBid = msg.newPrice;
        this.highestBidder = msg.bidderName;
        this.feed.unshift(newLogEntry);

        if (msg.availableFunds !== undefined) {
          this.availableFunds = msg.availableFunds;
        }

        this.cdr.detectChanges();
      });
    } catch (e) {
      console.error("Connection failed!", e);
    }
  }

  loadInitialState() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any>(`http://localhost:8080/api/v1/engine/auction-state/${this.auctionId}`, { headers })
      .subscribe({
        next: (state) => {
          this.currentBid = state.currentBid;
          this.highestBidder = state.highestBidder;
          this.availableFunds = state.availableFunds;
          this.endTime = new Date(state.endTime);
          this.auctionTitle = state.title || 'Live Auction';
          this.auctionDescription = state.description || '';
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error("State sync failed.", err);
        }
      });
  }

  placeBid() {
    if (!this.wsService.connectionStatus$.getValue()) {
      console.error('Pehle connect hone do!');
      return;
    }

    if (this.isBidding) {
      console.warn('Sabr rakho, purani bid process ho rahi hai...');
      return;
    }

    this.isBidding = true;
    const newBidAmount = this.currentBid + 500;
    this.wsService.sendBid(this.auctionId, newBidAmount);

    setTimeout(() => {
      this.isBidding = false;
    }, 2000);
  }

  updateCountdown() {
    if (!this.endTime) return;

    const now = new Date().getTime();
    const distance = new Date(this.endTime).getTime() - now;

    if (distance <= 0) {
      this.remainingTime = "00h 00m 00s";
      this.isUrgent = false;
      clearInterval(this.timerId);
      return;
    }

    this.isUrgent = distance < 60000;
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    this.remainingTime = `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }

  ngOnDestroy() {
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
    if (this.timerId) clearInterval(this.timerId);
  }
}