import { Component, OnInit } from '@angular/core';
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
export class Navbar implements OnInit {
  isDropdownOpen = false;
  availableFunds: number = 0;

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit() {
    this.loadFunds();
    this.loadProfile();
  }

  loadProfile() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get<any>('http://localhost:8080/api/v1/users/me', { headers })
      .subscribe({
        next: (res) => localStorage.setItem('fullName', res.fullName),
        error: () => {}
      });
  }

  get userInitials(): string {
    const fullName = localStorage.getItem('fullName') || '';
    if (fullName.trim()) {
      const parts = fullName.trim().split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return fullName.slice(0, 2).toUpperCase();
    }
    const email = localStorage.getItem('userEmail') || '';
    return email.slice(0, 2).toUpperCase();
  }

  get userName(): string {
    return localStorage.getItem('fullName') || localStorage.getItem('userEmail')?.split('@')[0] || '';
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
  toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  if (isDark) {
    html.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  } else {
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }
}

get isDarkMode(): boolean {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('fullName');
    this.router.navigate(['/login']);
  }
}