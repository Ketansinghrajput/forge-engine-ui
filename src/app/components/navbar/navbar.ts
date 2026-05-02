import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  isDropdownOpen = false;
  availableFunds: number = 0;

  constructor(private router: Router, private http: HttpClient) {
    this.loadFunds();
  }

  get userInitials(): string {
    const email = localStorage.getItem('userEmail') || '';
    return email.slice(0, 2).toUpperCase();
  }

  get userName(): string {
    const email = localStorage.getItem('userEmail') || '';
    return email.split('@')[0];
  }

  get userEmail(): string {
    return localStorage.getItem('userEmail') || 'bidder@forge.com';
  }

 loadFunds() {
  const token = localStorage.getItem('token');
  if (!token) return;
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  this.http.get<any>('http://localhost:8080/api/v1/wallet/balance', { headers })
    .subscribe({
      next: (res) => { this.availableFunds = res.totalBalance; },
      error: (err) => console.error('Funds load failed', err)
    });
}

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    this.router.navigate(['/login']);
  }
}