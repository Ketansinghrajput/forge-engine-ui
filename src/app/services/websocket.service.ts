import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import SockJS from 'sockjs-client';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { WalletService } from './wallet.service';

export interface AuctionUpdate {
  auctionId: number;
  newPrice: number;
  bidder: string;
  availableFunds?: number;
  bidderName?: string;
  endTime?: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private stompClient: Client | null = null;
  private auctionSubscription: StompSubscription | null = null;
  private errorSubscription: StompSubscription | null = null;

  public connectionStatus$ = new BehaviorSubject<boolean>(false);
  public updates$ = new Subject<AuctionUpdate>();

  constructor(private walletService: WalletService) {}

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

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws-forge'),
      connectHeaders: { 'Authorization': `Bearer ${token}` },
      debug: (msg: string) => {
        if (msg.includes('SEND') || msg.includes('MESSAGE')) {
          console.log('STOMP Log:', msg);
        }
      },
      reconnectDelay: 5000,
      onConnect: () => {
        this.connectionStatus$.next(true);
        const user = this.parseJwt(token)?.sub || 'Unknown User';
        console.log(`Connected to Forge Engine as: ${user}`);
        this.subscribeToAuction(auctionId);
        this.subscribeToPersonalErrors();
      },
      onStompError: (frame) => {
        this.connectionStatus$.next(false);
        console.error('WebSocket Error:', frame);
      }
    });

    this.stompClient.activate();
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
    this.auctionSubscription = this.stompClient.subscribe(topic, (msg: IMessage) => {
      if (msg.body) {
        const data: any = JSON.parse(msg.body);
        this.updates$.next(data);

        const currentUserEmail = localStorage.getItem('userEmail');

        if (data.highestBidderEmail === currentUserEmail && data.availableFunds !== undefined) {
          this.walletService.updateBalance(data.availableFunds);
        }

        if (data.highestBidderEmail !== currentUserEmail && data.type === 'BID_PLACED') {
          this.walletService.refreshProfileAndBalance();
        }
      }
    });
    console.log(`Subscribed to topic: ${topic}`);
  }

  private subscribeToPersonalErrors() {
    if (!this.stompClient || !this.stompClient.connected) return;

    if (this.errorSubscription) {
      this.errorSubscription.unsubscribe();
    }

    this.errorSubscription = this.stompClient.subscribe('/user/queue/errors', (msg: IMessage) => {
      if (msg.body) {
        const data: any = JSON.parse(msg.body);
        console.log('Personal error received:', data);

        this.updates$.next({
          ...data,
          type: 'BID_ERROR',
          errorMessage: data.message || data.errorMessage || data.error || msg.body
        });
      }
    });

    console.log('Subscribed to personal error queue: /user/queue/errors');
  }

  sendBid(auctionId: number, bidAmount: number) {
    if (this.stompClient && this.stompClient.connected) {
      const bidPayload = { auctionId, bidAmount };
      this.stompClient.publish({ destination: '/app/bid', body: JSON.stringify(bidPayload) });
      console.log('Bid Fired:', bidPayload);
    } else {
      console.error('Connection Down! Bid fail ho gayi bhayo');
    }
  }

  disconnect() {
    if (this.errorSubscription) {
      this.errorSubscription.unsubscribe();
    }
    if (this.stompClient) {
      this.stompClient.deactivate().then(() => {
        this.connectionStatus$.next(false);
        console.log('Disconnected from Engine.');
      });
    }
  }
}