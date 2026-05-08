import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../navbar/navbar';

// Terminal statuses — auction is over, no more bids
const TERMINAL = ['COMPLETED', 'EXPIRED', 'CLOSED', 'CANCELLED'];

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
  highestBidder: string = 'Loading...';
  auctionTitle: string = '';
  auctionDescription: string = '';
  auctionStatus: string = 'ACTIVE';
  auctionRef: string = '';
  auctionImageUrl: string = '';
  activityLogs: any[] = [];
  errorMsg: string = '';

  remainingTime: string = '';
  isUrgent: boolean = false;
  endTime: Date = new Date();
  startTime: Date = new Date();

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

  // ── computed helpers used in template ──────────────────────────────────────

  get isTerminal(): boolean {
    return TERMINAL.includes(this.auctionStatus);
  }

  /** CLOSED/COMPLETED with an actual winner */
get hasWinner(): boolean {
  const noWinnerValues = [
    'No Bids',
    'No Winner', 
    'Loading...',
    'Waiting for Bids...',
    'No Bids Yet',
    'Bidding not started',
    'Winner (check results)',
    ''
  ];
  return !!this.highestBidder && !noWinnerValues.includes(this.highestBidder);
}

  // ── lifecycle ──────────────────────────────────────────────────────────────

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
        console.log('WS msg:', msg);

          if (msg.type === 'BID_ERROR' || msg.type === 'ERROR' || msg.error || msg.errorMessage) {
    const rawErr = msg.errorMessage || msg.error || msg.message || 'Bid could not be placed.';
    this.errorMsg = rawErr.replace(/^bid failed:\s*/i, '').trim();
    this.isBidding = false;
    setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 5000);
    this.cdr.detectChanges();
    return;
  }

        const priceFromMsg = msg.newPrice || msg.currentHighestBid || msg.amount;

        // ── Terminal push from WebSocket ──────────────────────────────────
        const terminalByType = ['AUCTION_COMPLETED', 'AUCTION_EXPIRED', 'AUCTION_CLOSED'].includes(msg.type);
        const terminalByStatus = TERMINAL.includes(msg.status);

        if (terminalByType || terminalByStatus) {
          const newStatus = msg.status
            || msg.type?.replace('AUCTION_', '')
            || 'COMPLETED';
          this.auctionStatus = newStatus.toUpperCase();
          this.remainingTime = '00h 00m 00s';
          this.stopTimer();

          if (priceFromMsg) this.currentBid = priceFromMsg;

          const winnerRaw = msg.winnerName || msg.highestBidderName || msg.highestBidder || msg.bidder || '';
          this.highestBidder = this.resolveWinner(winnerRaw, this.auctionStatus);
          this.cdr.detectChanges();

          if (!this.settlementFetchDone) {
            this.settlementFetchDone = true;
            setTimeout(() => this.loadInitialState(), 1500);
          }
          return;
        }

        // ── Normal bid update ─────────────────────────────────────────────
        if (priceFromMsg) {
          this.currentBid = priceFromMsg;
          const bidderRaw = msg.bidderName || msg.winnerName || msg.bidder || '';
          const resolvedBidder = this.resolveDisplayName(bidderRaw);
          this.highestBidder = resolvedBidder;

          const isDuplicate = this.activityLogs.some(e => e.amount === priceFromMsg);
          if (!isDuplicate) {
            this.activityLogs.unshift({
              amount: priceFromMsg,
              bidderName: resolvedBidder,
              time: new Date()
            });
          }
        }

        // ── Snipe protection: auction extended ───────────────────────────
        if (msg.endTime) {
          const newEnd = new Date(msg.endTime);
          if (!isNaN(newEnd.getTime()) && newEnd.getTime() > this.endTime.getTime()) {
            this.endTime = newEnd;
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
      console.error('WS connection failed:', e);
    }
  }

  // ── data loading ───────────────────────────────────────────────────────────

  loadInitialState() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any>(`http://localhost:8080/api/v1/engine/auction-state/${this.auctionId}`, { headers })
      .subscribe({
        next: (state) => {
          this.activityLogs = state.history || [];

          this.currentBid       = state.currentBid ?? state.currentHighestBid ?? 0;
          this.auctionTitle     = state.title || 'Live Auction';
          this.auctionDescription = state.description || '';
          this.auctionImageUrl  = state.imageUrl || '';

          const backendStatus = (state.status || 'ACTIVE').toUpperCase();

          // Sync times
          if (state.startTime) {
            const t = new Date(state.startTime);
            if (!isNaN(t.getTime())) this.startTime = t;
          }
          if (state.endTime) {
            const t = new Date(state.endTime);
            if (!isNaN(t.getTime())) this.endTime = t;
          }

          const now = new Date().getTime();

          // Derive effective status
          if (backendStatus === 'ACTIVE' && this.startTime.getTime() > now) {
            this.auctionStatus = 'UPCOMING';
          } else {
            this.auctionStatus = backendStatus;
          }

          // Retry if backend still ACTIVE but time has passed (scheduler lag)
          if (this.endTime.getTime() <= now && this.auctionStatus === 'ACTIVE') {
            this.retryCount++;
            if (this.retryCount <= 5) {
              setTimeout(() => this.loadInitialState(), 3000);
            }
          } else {
            this.retryCount = 0;
          }

          // Resolve winner/bidder display
          const winnerRaw = state.highestBidderName || state.highestBidder || '';
          this.highestBidder = this.resolveWinner(winnerRaw, this.auctionStatus);

          // Stop timer if terminal
          if (TERMINAL.includes(this.auctionStatus)) {
            this.remainingTime = '00h 00m 00s';
            this.stopTimer();
          } else if (!this.timerId) {
            this.timerId = setInterval(() => {
              this.updateCountdown();
              this.cdr.detectChanges();
            }, 1000);
          }

          this.cdr.detectChanges();
        },
        error: (err) => console.error('Failed to load auction state:', err)
      });

    this.http.get<any>('http://localhost:8080/api/v1/wallets/balance', { headers })
      .subscribe({
        next: (wallet) => {
          this.availableFunds = wallet.balance ?? wallet.amount ?? 0;
          this.cdr.detectChanges();
        }
      });
  }

  // ── bidding ────────────────────────────────────────────────────────────────

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

  // ── countdown ──────────────────────────────────────────────────────────────

  updateCountdown() {
    const now = new Date().getTime();

    if (this.auctionStatus === 'UPCOMING' || this.startTime.getTime() > now) {
      const distance = this.startTime.getTime() - now;
      if (distance <= 0) {
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

    const distance = this.endTime.getTime() - now;
    if (distance <= 0) {
      this.remainingTime = '00h 00m 00s';
      this.isUrgent = false;
      this.stopTimer();
      if (!this.settlementFetchDone) {
        this.settlementFetchDone = true;
        this.retryCount = 0;
        setTimeout(() => this.loadInitialState(), 2000);
      }
      return;
    }

    this.isUrgent = distance < 60000;
    this.remainingTime = this.formatDistance(distance);
  }

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

  private stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private resolveDisplayName(raw: string): string {
    if (!raw) return 'Unknown';
    if (raw.includes('@')) return raw.split('@')[0];
    return raw;
  }

  /**
   * Determine what to show in the "winner" field based on status + raw name.
   * CLOSED/COMPLETED with no bidder = unsold.
   */
  private resolveWinner(raw: string, status: string): string {
    if (raw) return this.resolveDisplayName(raw);

    switch (status) {
      case 'CLOSED':
      case 'EXPIRED':    return 'No Bids';
      case 'COMPLETED':  return 'Winner (check results)';
      case 'UPCOMING':   return 'Bidding not started';
      case 'ACTIVE':     return 'No Bids Yet';
      default:           return 'No Bids Yet';
    }
  }

  // ── lifecycle cleanup ──────────────────────────────────────────────────────

  ngOnDestroy() {
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
    this.stopTimer();
  }
}