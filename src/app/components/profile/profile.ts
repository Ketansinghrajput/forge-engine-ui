import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit {
  profile: any = {};
  fullName = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  profileMsg = '';
  passwordMsg = '';
  profileError = '';
  passwordError = '';

  private get headers() {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.http.get<any>('http://localhost:8080/api/v1/users/me', { headers: this.headers })
      .subscribe({
       next: (res) => {
  this.profile = res;
  this.fullName = res.fullName;
  localStorage.setItem('fullName', res.fullName); 
},
        error: () => this.router.navigate(['/login'])
      });
  }

  get userInitials(): string {
    return (this.profile.fullName || this.profile.email || '')
      .slice(0, 2).toUpperCase();
  }

  updateProfile() {
    this.profileMsg = '';
    this.profileError = '';
    this.http.put<any>('http://localhost:8080/api/v1/users/me',
      { fullName: this.fullName },
      { headers: this.headers })
      .subscribe({
        next: (res) => {
          this.profile = res;
          this.profileMsg = 'Profile updated successfully.';
        },
        error: () => this.profileError = 'Update failed.'
      });
  }

  changePassword() {
    this.passwordMsg = '';
    this.passwordError = '';
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Passwords do not match.';
      return;
    }
    this.http.put('http://localhost:8080/api/v1/users/me/password',
      { currentPassword: this.currentPassword, newPassword: this.newPassword },
      { headers: this.headers })
      .subscribe({
        next: () => {
          this.passwordMsg = 'Password changed successfully.';
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
        },
        error: () => this.passwordError = 'Current password incorrect.'
      });
  }
}