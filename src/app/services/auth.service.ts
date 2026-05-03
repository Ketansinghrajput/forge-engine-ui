import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
private apiUrl = 'http://localhost:8080/api/v1/auth/login'; // authenticate ki jagah login
  constructor(private http: HttpClient) { }

 login(credentials: any): Observable<any> {
  return this.http.post(`${this.apiUrl}`, credentials).pipe(
    tap((res: any) => {
      if (res.token) {
        localStorage.setItem('token', res.token);
      }
      if (credentials.email) {
        localStorage.setItem('userEmail', credentials.email);
      }
    })
  );
}

  // Automation Check: Kya user pehle se logged in hai?
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  logout() {
    localStorage.removeItem('token');
    window.location.reload(); // State clean karne ke liye
  }
}