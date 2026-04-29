import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private apiUrl = 'http://localhost:8080/api/v1/wallets';

  constructor(private http: HttpClient) {}

  getWalletBalance(): Observable<any> {
    // Backend return karega: total_balance aur locked_amount
    return this.http.get(`${this.apiUrl}/me`);
  }
}