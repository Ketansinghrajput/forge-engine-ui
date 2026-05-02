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
  currentBalance: number = 0;

  presetAmounts = [10000, 25000, 50000, 100000, 250000];

  paymentMethods = [
    { id: 'upi', label: 'UPI', icon: '⬡' },
    { id: 'card', label: 'Credit / Debit Card', icon: '▣' },
    { id: 'netbanking', label: 'Net Banking', icon: '⊞' },
  ];

  constructor(private http: HttpClient, private router: Router) {
    this.loadBalance();
  }

  loadBalance() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get<any>('http://localhost:8080/api/v1/wallet/balance', { headers })
      .subscribe({
        next: (res) => { this.currentBalance = res.totalBalance; },
        error: (err) => console.error('Balance load failed', err)
      });
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

    // Simulate payment processing delay
    setTimeout(() => {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

      this.http.post<any>('http://localhost:8080/api/v1/wallet/topup',
        { amount: this.finalAmount }, { headers })
        .subscribe({
          next: (res) => {
            this.isProcessing = false;
            this.currentBalance += this.finalAmount;
            this.successMsg = `₹${this.finalAmount.toLocaleString('en-IN')} added successfully!`;
            this.selectedAmount = null;
            this.customAmount = null;
            this.selectedMethod = '';
          },
          error: (err) => {
            this.isProcessing = false;
            this.errorMsg = 'Transaction failed. Please try again.';
          }
        });
    }, 2000); // 2s fake processing
  }
}