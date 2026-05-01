import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import SockJS from 'sockjs-client';
import { over, Client, Subscription } from 'stompjs';

// 🚀 SENSEI: Interface define kar taaki compiler ko pata ho kya data aa raha hai
export interface AuctionUpdate {
  auctionId: number;
  newPrice: number;
  bidder: string;
  endTime?: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private stompClient: Client | null = null;
  private auctionSubscription: Subscription | null = null;

  // 🚀 SENSEI: BehaviorSubject use kar taaki UI ko current connection state hamesha pata rahe
  public connectionStatus$ = new BehaviorSubject<boolean>(false);
  public updates$ = new Subject<AuctionUpdate>();

  constructor() {}

 connect() {
  // 🚀 SENSEI: Token hamesha function call ke waqt uthao, taaki session switch ho sake
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('Sensei, token missing hai! WebSocket connect nahi hoga.');
    this.connectionStatus$.next(false);
    return;
  }

  // 1. Force Disconnect: Purana kachra saaf karo pehle
  if (this.stompClient && this.stompClient.connected) {
    this.disconnect();
  }

  const socket = new SockJS('http://localhost:8080/ws-forge');
  this.stompClient = over(socket);
  
  // Debug logs ko thoda saaf rakhte hain
  this.stompClient.debug = (msg: string) => {
    if (msg.includes('SEND') || msg.includes('MESSAGE')) {
      console.log('STOMP Log:', msg);
    }
  };

  // 🚀 2. Session Isolation: Har connection ke liye fresh headers
  const headers = {
    'Authorization': `Bearer ${token}`
  };

  this.stompClient.connect(
    headers,
    (frame) => {
      this.connectionStatus$.next(true);
      
      // Token decode karke confirm karo kaun sa user connect hua hai
      const user = this.parseJwt(token)?.sub || 'Unknown User';
      console.log(`Connected to Forge Engine as: ${user} 🛡️`);
      
      // Auction subscribe karne se pehle ensure karo ki context clean hai
      this.subscribeToAuction(1);
    },
    (err) => {
      this.connectionStatus$.next(false);
      console.error('WebSocket Error 🔴 Retrying in 5s...', err);
      // Exponential backoff ya simple timeout use karo
      setTimeout(() => this.connect(), 5000);
    }
  );
}

// 🚀 3. JWT Helper: Authentication debug karne ke liye
private parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}
  

  subscribeToAuction(auctionId: number) {
    if (!this.stompClient || !this.stompClient.connected) return;

    // 🚀 SENSEI FIX: Purana subscription unsub karo taaki memory leaks na hon
    if (this.auctionSubscription) {
      this.auctionSubscription.unsubscribe();
    }

    const topic = `/topic/auctions/${auctionId}`;
    this.auctionSubscription = this.stompClient.subscribe(topic, (msg) => {
      if (msg.body) {
        const data: AuctionUpdate = JSON.parse(msg.body);
        this.updates$.next(data);
      }
    });
    console.log(`Subscribed to topic: ${topic} 📡`);
  }

  sendBid(auctionId: number, bidAmount: number) {
    if (this.stompClient && this.stompClient.connected) {
      const bidPayload = { auctionId, bidAmount };
      
      // Send message to @MessageMapping("/bid")
      this.stompClient.send(
        '/app/bid', 
        {}, // Headers (JWT is already in the main connection)
        JSON.stringify(bidPayload)
      );
      console.log('🚀 Bid Fired:', bidPayload);
    } else {
      console.error('🔴 Connection Down! Bid fail ho gayi.');
    }
  }

  disconnect() {
    if (this.stompClient) {
      this.stompClient.disconnect(() => {
        this.connectionStatus$.next(false);
        console.log('Disconnected from Engine. Bye Sensei! 👋');
      });
    }
  }
}