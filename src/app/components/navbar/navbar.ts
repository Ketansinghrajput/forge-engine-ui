import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { WalletService } from '../../services/wallet.service'; // Ensure this path is correct

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar implements OnInit, OnDestroy {
  isDropdownOpen = false;
  availableFunds: number = 0;
  private balanceSub!: Subscription;

  // 1. Inject WalletService
  constructor(private router: Router, private walletService: WalletService) {}

  ngOnInit() {
    // 2. Subscribe to the live balance stream
    this.balanceSub = this.walletService.balance$.subscribe(balance => {
      this.availableFunds = balance;
    });

    // 3. Trigger the initial fetch through the service
    this.walletService.refreshProfileAndBalance();
  }

  ngOnDestroy() {
    // Always unsubscribe to prevent memory leaks
    if (this.balanceSub) {
      this.balanceSub.unsubscribe();
    }
  }

  get userInitials(): string {
    const fullName = localStorage.getItem('fullName') || '';
    if (fullName.trim() && fullName !== 'undefined') {
      const parts = fullName.trim().split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return fullName.slice(0, 2).toUpperCase();
    }
    const email = localStorage.getItem('userEmail') || '';
    return email.slice(0, 2).toUpperCase();
  }

  get userName(): string {
    const fullName = localStorage.getItem('fullName');
    return (fullName && fullName !== 'undefined') ? fullName : (localStorage.getItem('userEmail')?.split('@')[0] || '');
  }

  get userEmail(): string {
    return localStorage.getItem('userEmail') || 'bidder@forge.com';
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

  // Sirf ek logout method jo sab sahi se clear karega
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('fullName'); 
    this.router.navigate(['/login']);
  }
}