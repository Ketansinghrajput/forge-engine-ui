import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Navbar],
  templateUrl: './wallet.html',
  styleUrl: './wallet.css'
})
export class WalletComponent {

  selectedAmount: number | null = null;
  customAmount: number | null = null;
  selectedMethod: string = '';
  isProcessing = false;
  successMsg = '';
  errorMsg = '';

  // Balance
  availableBalance: number = 0;
  lockedAmount: number = 0;

  // Transactions
  transactions: any[] = [];
  txLoading = false;
  txFilter: string | null = null;

  // Pagination
  currentPage: number = 0;
  totalPages: number = 1;

  presetAmounts = [10000, 25000, 50000, 100000, 250000];

  paymentMethods = [
    { id: 'upi', label: 'UPI', icon: '⬡' },
    { id: 'card', label: 'Credit / Debit Card', icon: '▣' },
    { id: 'netbanking', label: 'Net Banking', icon: '⊞' },
  ];

  constructor(private http: HttpClient, private router: Router) {
    this.loadBalance();
    this.loadTransactions();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  loadBalance() {
    this.http.get<any>('http://localhost:8080/api/v1/wallet/balance', { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          this.availableBalance = res.availableBalance ?? res.balance ?? 0;
          this.lockedAmount = res.lockedAmount ?? 0;
        },
        error: (err) => console.error('Balance load failed', err)
      });
  }

  loadTransactions() {
    this.txLoading = true;
    const params: any = { page: this.currentPage, size: 10 };
    if (this.txFilter) params['type'] = this.txFilter;

    this.http.get<any>('http://localhost:8080/api/v1/wallet/transactions', {
      headers: this.getHeaders(),
      params
    }).subscribe({
      next: (res) => {
        this.transactions = res.content ?? res ?? [];
        this.totalPages = res.totalPages ?? 1;
        this.txLoading = false;
      },
      error: (err) => {
        console.error('Transactions load failed', err);
        this.txLoading = false;
      }
    });
  }

  setFilter(filter: string | null) {
    this.txFilter = filter;
    this.currentPage = 0;
    this.loadTransactions();
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadTransactions();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadTransactions();
    }
  }

  get finalAmount(): number {
    return this.customAmount || this.selectedAmount || 0;
  }

  selectPreset(amount: number) {
    this.selectedAmount = amount;
    this.customAmount = null;
  }

  topUp() {
    if (!this.finalAmount || this.finalAmount <= 0) {
      this.errorMsg = 'Please select or enter an amount.';
      return;
    }
    if (!this.selectedMethod) {
      this.errorMsg = 'Please select a payment method.';
      return;
    }

    this.isProcessing = true;
    this.errorMsg = '';

    setTimeout(() => {
      this.http.post<any>('http://localhost:8080/api/v1/wallet/topup',
        { amount: this.finalAmount }, { headers: this.getHeaders() })
        .subscribe({
          next: (res) => {
            this.isProcessing = false;
            this.successMsg = `₹${this.finalAmount.toLocaleString('en-IN')} added successfully!`;
            this.selectedAmount = null;
            this.customAmount = null;
            this.selectedMethod = '';
            this.loadBalance();
            this.loadTransactions();
          },
          error: (err) => {
            this.isProcessing = false;
            this.errorMsg = 'Transaction failed. Please try again.';
          }
        });
    }, 2000);
  }
}