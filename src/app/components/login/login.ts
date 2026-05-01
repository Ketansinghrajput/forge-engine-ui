import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  email = '';
  password = '';
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    this.isLoading = true;
    const credentials = { email: this.email, password: this.password };

    this.authService.login(credentials).subscribe({
      next: (res) => {
        console.log('Sensei, Access Granted! 🛡️');
        this.router.navigate(['/auctions']); // Redirect to Auction Page
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Login Failed!', err);
        alert('Invalid credentials, Sensei! Database check karo.');
      }
    });
  }
}