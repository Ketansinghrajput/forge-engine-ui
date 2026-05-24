import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private balanceState = new BehaviorSubject<number>(0);
  public balance$ = this.balanceState.asObservable();

  constructor(private http: HttpClient) {}

 refreshProfileAndBalance() {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  
  this.http.get<any>('http://localhost:8080/api/v1/users/me', { headers })
    .subscribe({
      next: (res) => {
        localStorage.setItem('fullName', res.fullName);
        localStorage.setItem('userEmail', res.email);
      }
    });

  this.http.get<any>('http://localhost:8080/api/v1/wallet/balance', { headers })
    .subscribe({
      next: (wallet) => {
        const available = wallet.balance ?? wallet.availableBalance ?? wallet.amount ?? 0;
        console.log("SENSEI DEBUG: Available Balance ->", available);
        this.balanceState.next(available);
      },
      error: (err) => console.error('Balance fetch failed', err)
    });
}

  updateBalance(newBalance: number) {
    this.balanceState.next(newBalance);
  }
}