import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Navbar } from '../navbar/navbar';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-auction-lobby',
  standalone: true,
  imports: [CommonModule, Navbar, RouterModule],
  templateUrl: './auction-lobby.html',
  styleUrl: './auction-lobby.css'
})
export class AuctionLobbyComponent implements OnInit {

  auctionItems: any[] = [];
  currentUserEmail: string | null = null;

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.currentUserEmail = this.getCurrentUserEmail();
    this.loadAuctionItems();
  }

  getCurrentUserEmail(): string | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || null;
    } catch {
      return null;
    }
  }

  loadAuctionItems() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    // Backend fetching both ACTIVE and PLANNED
    this.http.get<any>('http://localhost:8080/api/v1/auctions/active', { headers })
      .subscribe({
        next: (response) => {
          const items = response.content || []; 
          
          this.auctionItems = items.map((item: any) => ({
            id: item.id,
            title: item.title,
            startingPrice: item.currentHighestBid,
            currentHighestBid: item.currentHighestBid,
            startTime: item.startTime ? new Date(item.startTime) : null, // Store as Date for logic
            endTime: item.endTime ? new Date(item.endTime) : new Date(),
            imageUrl: item.imageUrl || '',
            quickFact: item.description || '',
            sellerEmail: item.sellerEmail,
            status: item.status // 🔥 Capture status for UI logic
          }));

          // 🔥 SENSEI FIX: Earliest ending first (Ascending order by endTime)
          this.auctionItems.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());
        },
        error: (err) => console.error('Lobby load failed', err)
      });
  }

  deleteAuction(id: number, event: MouseEvent) {
    event.stopPropagation();
    if (!confirm('Are you sure? Auction permanently delete ho jayega.')) return;

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.delete(`http://localhost:8080/api/v1/auctions/${id}`, { headers, responseType: 'text' })
      .subscribe({
        next: () => {
          this.auctionItems = this.auctionItems.filter(a => a.id !== id);
        },
        error: (err) => console.error('Delete failed', err)
      });
  }

  goToAuction(id: number) {
    this.router.navigate(['/auction-detail', id]);
  }
}