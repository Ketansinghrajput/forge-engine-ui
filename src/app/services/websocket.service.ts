import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import SockJS from 'sockjs-client';
import { Client, over } from 'stompjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private stompClient: any;
  public updates$ = new Subject<any>();
  public isConnected: boolean = false;

  connect() {
    // 1. Asli JWT Token uthao (LocalStorage se ya Auth Service se)
    const token = localStorage.getItem('token'); 
    
    const socket = new SockJS('http://localhost:8080/ws-forge');
    this.stompClient = over(socket);
    this.stompClient.debug = () => {}; 

    // 2. STOMP Connection Headers mein JWT Pass karo
    const headers = {
      'Authorization': 'Bearer ' + token
    };

    this.stompClient.connect(headers, (frame: any) => {
      this.isConnected = true;
      console.log('Connected to Forge Engine with Identity! 🛡️');
      
      // Filhal ID 1 hardcoded hai, par ise dynamic banana easy hai
      this.subscribeToAuction(1); 
      
    }, (err: any) => {
      this.isConnected = false;
      console.error('WebSocket Error 🔴', err);
      setTimeout(() => this.connect(), 5000); // Auto-reconnect
    });
  }

  subscribeToAuction(auctionId: number) {
    this.stompClient.subscribe(`/topic/auctions/${auctionId}`, (msg: any) => {
      if (msg.body) {
        const data = JSON.parse(msg.body);
        this.updates$.next(data);
      }
    });
  }

  sendBid(auctionId: number, bidAmount: number) {
    // SENSEI: Ab userEmail bhejne ki zaroorat nahi hai! 
    // Backend JWT se khud nikal lega ki kaun bid maar raha hai.
    if (this.stompClient && this.stompClient.connected) {
      const bidPayload = {
        auctionId: auctionId,
        bidAmount: bidAmount
      };
      
      // Professional way: Headers yahan bhi bhej sakte ho agar backend support kare
      this.stompClient.send('/app/bid', {}, JSON.stringify(bidPayload));
      console.log('🚀 Bid Fired to Engine:', bidPayload);
    } else {
      console.error('🔴 Connection Down! Pehle login check karo.');
    }
  }
}