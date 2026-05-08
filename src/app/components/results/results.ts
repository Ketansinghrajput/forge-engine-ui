import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { Navbar } from '../navbar/navbar';

interface AuctionResult {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  status: string;
  startPrice: number;
  currentPrice: number;
  bidCount: number;
  endTime: Date;
  winnerName: string | null;
  winnerEmail: string | null;
  sellerEmail: string;
}

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar],
  templateUrl: './results.html',
  styleUrl: './results.css'
})
export class ResultsComponent implements OnInit {

  results: AuctionResult[] = [];
  filteredResults: AuctionResult[] = [];
  isLoading = true;
  error = false;
  activeFilter: string = 'ALL';
  currentUserEmail: string | null = null;

  readonly filters = ['ALL', 'SOLD', 'UNSOLD'];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.currentUserEmail = this.getCurrentUserEmail();
    this.loadResults();
  }

  private getCurrentUserEmail(): string | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || null;
    } catch {
      return null;
    }
  }

  loadResults(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any>('http://localhost:8080/api/v1/auctions/results', { headers })
      .subscribe({
        next: (response) => {
          const items: any[] = response.content || [];
          this.results = items.map((item: any) => ({
            id:           item.id,
            title:        item.title,
            description:  item.description || '',
            imageUrl:     item.imageUrl || '',
            status:       item.status,
            startPrice:   item.startPrice || 0,
            currentPrice: item.currentPrice || 0,
            bidCount:     item.bidCount || 0,
            endTime:      new Date(item.endTime),
            winnerName:   item.winnerName || null,
            winnerEmail:  item.winnerEmail || null,
            sellerEmail:  item.sellerEmail || '',
          }));

          this.applyFilter('ALL');
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Results load failed', err);
          this.error = true;
          this.isLoading = false;
        }
      });
  }

  applyFilter(filter: string): void {
    this.activeFilter = filter;
    if (filter === 'ALL') {
      this.filteredResults = [...this.results];
    } else if (filter === 'SOLD') {
      this.filteredResults = this.results.filter(r => this.isSold(r));
    } else if (filter === 'UNSOLD') {
      this.filteredResults = this.results.filter(r => !this.isSold(r));
    }
  }

 getStatusLabel(item: AuctionResult): string {
  if (item.status === 'COMPLETED' || item.status === 'CLOSED') {
    return this.isSold(item) ? 'SOLD' : 'UNSOLD';
  }
  const map: Record<string, string> = {
    EXPIRED:   'EXPIRED',
    CANCELLED: 'CANCELLED',
  };
  return map[item.status] || item.status;
}
  isSold(item: AuctionResult): boolean {
  if (item.status === 'COMPLETED' || item.status === 'CLOSED') {
    return item.winnerEmail !== null && item.winnerEmail !== '';
  }
  return false;
}

  getPriceIncrease(item: AuctionResult): number {
    if (!item.startPrice || item.startPrice === 0) return 0;
    return Math.round(((item.currentPrice - item.startPrice) / item.startPrice) * 100);
  }

  get totalGMV(): number {
    return this.results
      .filter(r => this.isSold(r))
      .reduce((sum, r) => sum + r.currentPrice, 0);
  }

  get totalSold(): number {
    return this.results.filter(r => this.isSold(r)).length;
  }

  get totalUnsold(): number {
    return this.results.filter(r => !this.isSold(r)).length;
  }
}