import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { WebsocketService } from '../../services/websocket.service'; 

@Component({
  selector: 'app-auction-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auction-detail.html',
  styleUrl: './auction-detail.css' // SENSEI: Make sure it's styleUrl (Angular 17+) or styleUrls array
})
export class AuctionDetail implements OnInit, OnDestroy {
  // --- UI State Variables ---
  currentBid: number = 12000;
  availableFunds: number = 14500; // Mock Wallet balance
  highestBidder: string = 'Waiting...';
  feed: any[] = []; 

  remainingTime: string = '';
  isUrgent: boolean = false;
  endTime: Date = new Date(Date.now() + 5000000); 

  private wsSubscription!: Subscription;
  private timerId: any;

  constructor(
    public wsService: WebsocketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // 1. TIMER ENGINE
    this.updateCountdown();
    this.timerId = setInterval(() => {
      this.updateCountdown();
      this.cdr.detectChanges(); 
    }, 1000);

    // 2. WEBSOCKET ENGINE
    try {
      this.wsService.connect();
      this.wsSubscription = this.wsService.updates$.subscribe((msg: any) => {
        console.log('--- BROADCAST RECEIVED ---', msg);

        // 🚀 SENSEI FIX 1: Backend ab 'newPrice' aur 'bidder' bhejta hai
        this.currentBid = msg.newPrice || this.currentBid;
        this.highestBidder = msg.bidder || this.highestBidder;

        // 🚀 SENSEI FIX 2: Wallet balance update logic (Temporary Hack)
        // Note: Interview se pehle isko ek proper REST call se replace karna padega.
        // `msg.bidder` ke saath tera asli email match karwana hoga jab JWT proper parse ho.
        if (msg.bidder === 'tester@forge.com') { // Apne backend wale test user ka naam daal de yahan
           this.availableFunds = 14500 - (this.currentBid - 12000);
        }

        // 🚀 SENSEI FIX 3: Feed ke keys bhi fix kar diye
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

  placeBid() {
    if (!this.wsService.isConnected) {
      alert("Wait Sensei! Engine is warming up...");
      return;
    }

    const newBidAmount = this.currentBid + 500;
    
    // Check if funds available
    if (newBidAmount - 12000 > 14500) {
      alert("Aukaat se bahar! Funds insufficient.");
      return;
    }

    // 🚀 SENSEI FIX 4: Yahan se 'currentUserEmail' hata diya kyunki backend Token se nikalega
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
}