import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Navbar } from '../navbar/navbar';

interface BidEntry {
  bidId: number;
  amount: number;
  auctionId: number;
  auctionTitle: string;
  auctionStatus: string;
  imageUrl: string;
  successful: boolean;
  placedAt: string;
}

@Component({
  selector: 'app-my-bids',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar],
  templateUrl: './my-bids.html',
  styleUrl: './my-bids.css'
})
export class MyBids implements OnInit {
  bids: BidEntry[] = [];
  isLoading = true;
  error = '';

  get groupedBids(): { auctionId: number; auctionTitle: string; auctionStatus: string; imageUrl: string; bids: BidEntry[] }[] {
    const map = new Map<number, any>();
    for (const bid of this.bids) {
      if (!map.has(bid.auctionId)) {
        map.set(bid.auctionId, {
          auctionId: bid.auctionId,
          auctionTitle: bid.auctionTitle,
          auctionStatus: bid.auctionStatus,
          imageUrl: bid.imageUrl,
          bids: []
        });
      }
      map.get(bid.auctionId).bids.push(bid);
    }
    return Array.from(map.values());
  }

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadMyBids();
  }

  loadMyBids() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<BidEntry[]>('http://localhost:8080/api/v1/bids/my', { headers })
      .subscribe({
        next: (data) => {
          this.bids = data;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = 'Failed to load bids.';
          this.isLoading = false;
        }
      });
  }

  isWinner(group: any): boolean {
    return group.auctionStatus === 'COMPLETED' &&
           group.bids.some((b: BidEntry) => b.successful);
  }

  getStatusLabel(status: string): string {
    if (status === 'COMPLETED') return 'Settled';
    if (status === 'EXPIRED') return 'Unsold';
    return 'Live';
  }

  enterAuction(auctionId: number) {
    this.router.navigate(['/auction-detail', auctionId]);
  }
}