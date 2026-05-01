import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { WebsocketService } from '../../services/websocket.service'; 
import { HttpClient, HttpHeaders } from '@angular/common/http'; // 🚀 SENSEI FIX: API Imports

@Component({
  selector: 'app-auction-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auction-detail.html',
  styleUrl: './auction-detail.css' 
})
export class AuctionDetail implements OnInit, OnDestroy {
  // --- UI State Variables ---
  // 🚀 SENSEI FIX: Hardcode hata diya. Ab 0 se start hoga, API real data layegi
  currentBid: number = 0;
  availableFunds: number = 0; 
  highestBidder: string = 'Loading engine...';
  feed: any[] = []; 

  remainingTime: string = '';
  isUrgent: boolean = false;
  endTime: Date = new Date(Date.now() + 5000000); 

  private wsSubscription!: Subscription;
  private timerId: any;

  constructor(
    public wsService: WebsocketService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient // 🚀 SENSEI FIX: HttpClient inject kiya
  ) {}

  ngOnInit() {
    // 1. STATE SYNC ENGINE (Fetch Real Data from DB)
    this.loadInitialState();

    // 2. TIMER ENGINE
    this.updateCountdown();
    this.timerId = setInterval(() => {
      this.updateCountdown();
      this.cdr.detectChanges(); 
    }, 1000);

    // 3. WEBSOCKET ENGINE
    try {
      this.wsService.connect(); // Sirf connect call karo

// Subscription hamesha active rahega, jaise hi data aayega ye trigger hoga
this.wsSubscription = this.wsService.updates$.subscribe((msg: any) => {
    console.log('--- BROADCAST RECEIVED ---', msg);

    // 🚀 SENSEI: Price update logic
    this.currentBid = msg.newPrice; 
    this.highestBidder = msg.bidder;

    // Wallet sync
    if (msg.bidder === 'don@forge.com') { // Apne naye email se match karo
        this.availableFunds -= 500;
    }

this.cdr.markForCheck(); // Heavy update ke liye
    this.cdr.detectChanges();

if (msg.endTime) {
        this.endTime = new Date(msg.endTime); // 🚀 Auction extend hone par timer update hoga
    }
        // Feed log update
        const newLogEntry = {
          newPrice: msg.newPrice,
          bidder: msg.bidder,
          timestamp: new Date().toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true 
          })
        };
        this.feed.unshift(newLogEntry);

        this.cdr.detectChanges();
      });
    } catch (e) {
      console.error("Connection failed!", e);
    }
  }

  // 🚀 SENSEI FIX: Naya method jo Backend se initial state layega
  loadInitialState() {
    const token = localStorage.getItem('token'); 
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any>('http://localhost:8080/api/v1/engine/auction-state/1', { headers })
      .subscribe({
        next: (state) => {
          console.log("--- INITIAL STATE LOADED ---", state);
          this.currentBid = state.currentBid;
          this.highestBidder = state.highestBidder;
          this.availableFunds = state.availableFunds;
          this.endTime = new Date(state.endTime);
          this.cdr.detectChanges(); // UI update maar
        },
        error: (err) => {
          console.error("State sync failed. Token expired ya backend band hai?", err);
        }
      });
  }

  placeBid() {
    if (!this.wsService.connectionStatus$.getValue()) {
    console.error('🔴 Pehle connect hone do, Sensei!');
    return;
    }

    const newBidAmount = this.currentBid + 500;
    
    // Fire the engine
    this.wsService.sendBid(1, newBidAmount);
  }

  updateCountdown() {
    const now = new Date().getTime();
    const distance = new Date(this.endTime).getTime() - now;

    if (distance <= 0) {
      this.remainingTime = "00h 00m 00s";
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
}export class AuctionDetailComponent { // 🚀 SENSEI: Is line ko verify karo
  // Tumhara existing code yahan hoga
}