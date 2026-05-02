import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import SockJS from 'sockjs-client';
import { over, Client, Subscription } from 'stompjs';

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

  public connectionStatus$ = new BehaviorSubject<boolean>(false);
  public updates$ = new Subject<AuctionUpdate>();

  constructor() {}

  connect(auctionId: number = 1) {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('Token missing! WebSocket connect nahi hoga.');
      this.connectionStatus$.next(false);
      return;
    }

    if (this.stompClient && this.stompClient.connected) {
      this.disconnect();
    }

    const socket = new SockJS('http://localhost:8080/ws-forge');
    this.stompClient = over(socket);
    
    this.stompClient.debug = (msg: string) => {
      if (msg.includes('SEND') || msg.includes('MESSAGE')) {
        console.log('STOMP Log:', msg);
      }
    };

    const headers = { 'Authorization': `Bearer ${token}` };

    this.stompClient.connect(
      headers,
      (frame) => {
        this.connectionStatus$.next(true);
        const user = this.parseJwt(token)?.sub || 'Unknown User';
        console.log(`Connected to Forge Engine as: ${user}`);
        this.subscribeToAuction(auctionId);
      },
      (err) => {
        this.connectionStatus$.next(false);
        console.error('WebSocket Error. Retrying in 5s...', err);
        setTimeout(() => this.connect(auctionId), 5000);
      }
    );
  }

  private parseJwt(token: string) {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  }

  subscribeToAuction(auctionId: number) {
    if (!this.stompClient || !this.stompClient.connected) return;

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
    console.log(`Subscribed to topic: ${topic}`);
  }

  sendBid(auctionId: number, bidAmount: number) {
    if (this.stompClient && this.stompClient.connected) {
      const bidPayload = { auctionId, bidAmount };
      this.stompClient.send('/app/bid', {}, JSON.stringify(bidPayload));
      console.log('Bid Fired:', bidPayload);
    } else {
      console.error('Connection Down! Bid fail ho gayi.');
    }
  }

  disconnect() {
    if (this.stompClient) {
      this.stompClient.disconnect(() => {
        this.connectionStatus$.next(false);
        console.log('Disconnected from Engine.');
      });
    }
  }
}