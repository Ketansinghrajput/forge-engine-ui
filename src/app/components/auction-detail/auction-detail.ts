import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-auction-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, Navbar],
  templateUrl: './auction-detail.html',
  styleUrl: './auction-detail.css'
})
export class AuctionDetail implements OnInit, OnDestroy {
  auctionId: number = 1;

  currentBid: number = 0;
  customBidAmount: number = 0;
  availableFunds: number = 0;
  highestBidder: string = 'Loading engine...';
  auctionTitle: string = '';
  auctionDescription: string = '';
  auctionStatus: string = 'ACTIVE';
  auctionRef: string = '';
  auctionImageUrl: string = '';
  feed: any[] = [];
  errorMsg: string = '';

  remainingTime: string = '';
  isUrgent: boolean = false;
  endTime: Date = new Date();
  startTime: Date = new Date(); // ✅ NEW

  isDropdownOpen: boolean = false;
  isBidding: boolean = false;
  private wsSubscription!: Subscription;
  private timerId: any;
  private settlementFetchDone: boolean = false;
  private retryCount: number = 0;

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

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.auctionId = Number(id) || 1;
    this.auctionRef = `#FORGE-LOT-${this.auctionId}`;

    this.loadInitialState();

    this.timerId = setInterval(() => {
      this.updateCountdown();
      this.cdr.detectChanges();
    }, 1000);

    try {
      this.wsService.connect(this.auctionId);
      this.wsSubscription = this.wsService.updates$.subscribe((msg: any) => {
        console.log("SENSEI DEBUG: Received WebSocket msg", msg);

        const priceFromMsg = msg.newPrice || msg.currentHighestBid;

        // Handle Settlement via WebSocket push
        if (msg.type === 'AUCTION_COMPLETED' || msg.type === 'AUCTION_EXPIRED' ||
            msg.status === 'COMPLETED' || msg.status === 'EXPIRED') {

          const newStatus = (msg.status || msg.type?.replace('AUCTION_', '') || 'COMPLETED').toUpperCase();
          this.auctionStatus = newStatus;
          this.remainingTime = "00h 00m 00s";
          if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }

          if (priceFromMsg) this.currentBid = priceFromMsg;

          const winnerRaw = msg.winnerName || msg.highestBidderName || msg.highestBidder || msg.bidder || '';
          this.highestBidder = this.resolveDisplayName(winnerRaw);
          this.cdr.detectChanges();

          if (!this.settlementFetchDone) {
            this.settlementFetchDone = true;
            setTimeout(() => this.loadInitialState(), 1500);
          }
          return;
        }

        // Normal Bid Update
        if (priceFromMsg) {
          this.currentBid = priceFromMsg;
          const bidderRaw = msg.bidderName || msg.winnerName || msg.bidder || '';
          this.highestBidder = this.resolveDisplayName(bidderRaw);

          const isDuplicate = this.feed.some(entry => entry.newPrice === priceFromMsg);
          if (!isDuplicate) {
            this.feed.unshift({
              newPrice: priceFromMsg,
              bidderName: this.highestBidder,
              timestamp: new Date().toLocaleTimeString('en-IN')
            });
          }
        }

        // Sync extended endTime from WS broadcast
        if (msg.endTime) {
          const newEndTime = new Date(msg.endTime);
          if (!isNaN(newEndTime.getTime()) && newEndTime.getTime() > this.endTime.getTime()) {
            console.log("SENSEI DEBUG: Auction extended! New endTime:", msg.endTime);
            this.endTime = newEndTime;
            this.settlementFetchDone = false;
            this.retryCount = 0;

            if (!this.timerId) {
              this.auctionStatus = 'ACTIVE';
              this.timerId = setInterval(() => {
                this.updateCountdown();
                this.cdr.detectChanges();
              }, 1000);
            }
          }
        }

        if (msg.availableFunds !== undefined) {
          this.availableFunds = msg.availableFunds;
        }

        this.cdr.detectChanges();
      });
    } catch (e) {
      console.error("Connection failed!", e);
    }
  }

  private resolveDisplayName(raw: string): string {
    if (!raw) return 'Unknown';
    if (raw.includes('@')) return raw.split('@')[0];
    return raw;
  }

  loadInitialState() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any>(`http://localhost:8080/api/v1/engine/auction-state/${this.auctionId}`, { headers })
      .subscribe({
        next: (state) => {
          console.log("SENSEI DEBUG: Backend State ->", state);

          this.currentBid = state.currentBid ?? state.currentHighestBid ?? 0;
          this.auctionTitle = state.title || 'Live Auction';
          this.auctionDescription = state.description || '';
          this.auctionImageUrl = state.imageUrl || '';

          const backendStatus = (state.status || 'ACTIVE').toUpperCase();

          // ✅ Sync startTime
          if (state.startTime) {
            const fetchedStartTime = new Date(state.startTime);
            if (!isNaN(fetchedStartTime.getTime())) {
              this.startTime = fetchedStartTime;
            }
          }

          // ✅ Sync endTime
          if (state.endTime) {
            const fetchedEndTime = new Date(state.endTime);
            if (!isNaN(fetchedEndTime.getTime())) {
              this.endTime = fetchedEndTime;
            }
          }

          const now = new Date().getTime();

          // ✅ Check if auction hasn't started yet
          if (this.startTime.getTime() > now && backendStatus === 'ACTIVE') {
            this.auctionStatus = 'UPCOMING';
          } else {
            this.auctionStatus = backendStatus;
          }

          // Retry if backend still says ACTIVE but end time has passed
          if (this.endTime.getTime() <= now && this.auctionStatus === 'ACTIVE') {
            this.retryCount++;
            if (this.retryCount <= 5) {
              setTimeout(() => this.loadInitialState(), 3000);
            }
          } else {
            this.retryCount = 0;
          }

          const winnerRaw = state.highestBidderName || state.highestBidder || '';
          if (winnerRaw) {
            this.highestBidder = this.resolveDisplayName(winnerRaw);
          } else if (this.auctionStatus === 'COMPLETED') {
            this.highestBidder = 'Winner (check results)';
          } else if (this.auctionStatus === 'EXPIRED') {
            this.highestBidder = 'No Winner';
          } else if (this.auctionStatus === 'UPCOMING') {
            this.highestBidder = 'Bidding not started';
          } else {
            this.highestBidder = 'No Bids Yet';
          }

          if (this.auctionStatus === 'COMPLETED' || this.auctionStatus === 'EXPIRED') {
            this.remainingTime = "00h 00m 00s";
            if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
          } else if (!this.timerId) {
            this.timerId = setInterval(() => {
              this.updateCountdown();
              this.cdr.detectChanges();
            }, 1000);
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error("SENSEI DEBUG: Failed to load auction state", err);
        }
      });

    this.http.get<any>(`http://localhost:8080/api/v1/wallets/balance`, { headers })
      .subscribe({
        next: (wallet) => {
          this.availableFunds = wallet.balance ?? wallet.amount ?? 0;
          this.cdr.detectChanges();
        }
      });
  }

  placeBid() {
    if (this.auctionStatus !== 'ACTIVE') return;

    if (this.customBidAmount <= this.currentBid) {
      this.errorMsg = `Minimum bid is ₹${this.currentBid + 1}`;
      return;
    }

    if (this.customBidAmount > this.availableFunds) {
      this.errorMsg = `Insufficient funds. Available: ₹${this.availableFunds.toLocaleString('en-IN')}`;
      return;
    }

    this.errorMsg = '';
    this.isBidding = true;
    this.wsService.sendBid(this.auctionId, this.customBidAmount);
    setTimeout(() => {
      this.isBidding = false;
      this.customBidAmount = 0;
    }, 1500);
  }

  updateCountdown() {
    const now = new Date().getTime();

    // ✅ UPCOMING: show start countdown
    if (this.auctionStatus === 'UPCOMING' || this.startTime.getTime() > now) {
      const distance = this.startTime.getTime() - now;
      if (distance <= 0) {
        // Just started — reload to get ACTIVE status
        this.auctionStatus = 'ACTIVE';
        this.settlementFetchDone = false;
        this.retryCount = 0;
        this.loadInitialState();
        return;
      }
      this.remainingTime = this.formatDistance(distance);
      return;
    }

    if (this.auctionStatus !== 'ACTIVE') return;
    if (!this.endTime) return;

    const distance = this.endTime.getTime() - now;

    if (distance <= 0) {
      this.remainingTime = "00h 00m 00s";
      this.isUrgent = false;
      if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
      if (!this.settlementFetchDone) {
        this.settlementFetchDone = true;
        this.retryCount = 0;
        console.log("Timer zero! Fetching final result...");
        setTimeout(() => this.loadInitialState(), 2000);
      }
      return;
    }

    this.isUrgent = distance < 60000;
    this.remainingTime = this.formatDistance(distance);
  }

  // ✅ Shared formatter for both start and end countdowns
  private formatDistance(distance: number): string {
    const days    = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
    }
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }

  toggleDropdown() { this.isDropdownOpen = !this.isDropdownOpen; }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
    if (this.timerId) clearInterval(this.timerId);
  }
}