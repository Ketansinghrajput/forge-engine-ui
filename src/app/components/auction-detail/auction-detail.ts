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

  remainingTime: string = '';
  isUrgent: boolean = false;
  endTime: Date = new Date();

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

        // ✅ KEY FIX: Sync extended endTime from WS broadcast
        if (msg.endTime) {
          const newEndTime = new Date(msg.endTime);
          if (!isNaN(newEndTime.getTime()) && newEndTime.getTime() > this.endTime.getTime()) {
            console.log("SENSEI DEBUG: Auction extended! New endTime:", msg.endTime);
            this.endTime = newEndTime;
            this.settlementFetchDone = false; // reset so timer zero triggers fetch again
            this.retryCount = 0;

            // Restart timer if it was cleared
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
          this.auctionStatus = backendStatus;

          // ✅ Always sync endTime from backend (catches extensions too)
          if (state.endTime) {
            const fetchedEndTime = new Date(state.endTime);
            if (!isNaN(fetchedEndTime.getTime())) {
              this.endTime = fetchedEndTime;
            }
          }

          const now = new Date().getTime();

          // ✅ Retry if backend still says ACTIVE but time has passed
          if (this.endTime.getTime() <= now && backendStatus === 'ACTIVE') {
            this.retryCount++;
            if (this.retryCount <= 5) {
              setTimeout(() => this.loadInitialState(), 3000);
            }
          } else {
            this.retryCount = 0; // reset on clean state
          }

          const winnerRaw = state.highestBidderName || state.highestBidder || '';
          if (winnerRaw) {
            this.highestBidder = this.resolveDisplayName(winnerRaw);
          } else if (backendStatus === 'COMPLETED') {
            this.highestBidder = 'Winner (check results)';
          } else if (backendStatus === 'EXPIRED') {
            this.highestBidder = 'No Winner';
          } else {
            this.highestBidder = 'No Bids Yet';
          }

          if (backendStatus === 'COMPLETED' || backendStatus === 'EXPIRED') {
            this.remainingTime = "00h 00m 00s";
            if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
          } else if (!this.timerId) {
            // ✅ Restart timer if it was cleared but auction is still active
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
      alert(`Min bid: ₹${this.currentBid + 1}`);
      return;
    }
    this.isBidding = true;
    this.wsService.sendBid(this.auctionId, this.customBidAmount);
    setTimeout(() => {
      this.isBidding = false;
      this.customBidAmount = 0;
    }, 1500);
  }

  updateCountdown() {
    if (this.auctionStatus !== 'ACTIVE') return;
    if (!this.endTime) return;

    const now = new Date().getTime();
    const distance = new Date(this.endTime).getTime() - now;

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
    const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((distance / (1000 * 60)) % 60);
    const seconds = Math.floor((distance / 1000) % 60);
    this.remainingTime = `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
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