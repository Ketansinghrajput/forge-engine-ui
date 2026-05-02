import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-create-auction',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Navbar],
  templateUrl: './create-auction.html',
  styleUrl: './create-auction.css'
})
export class CreateAuctionComponent {

  form = {
    title: '',
    description: '',
    startingPrice: null as number | null,
    startTime: '',
    endTime: '',
     imageUrl: '' 
  };

  isSubmitting = false;
  errorMsg = '';
  successMsg = '';

  constructor(private http: HttpClient, private router: Router) {}

  submit() {
    if (!this.form.title || !this.form.startingPrice || !this.form.startTime || !this.form.endTime) {
      this.errorMsg = 'All fields are required.';
      return;
    }

    this.isSubmitting = true;
    this.errorMsg = '';

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const payload = {
      title: this.form.title,
      description: this.form.description,
      startingPrice: this.form.startingPrice,
      startTime: this.form.startTime + ':00',  // LocalDateTime format
      endTime: this.form.endTime + ':00',
       imageUrl: this.form.imageUrl  
    };

    this.http.post<any>('http://localhost:8080/api/v1/auctions', payload, { headers })
      .subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.successMsg = `Auction "${res.title}" is now live!`;
          setTimeout(() => this.router.navigate(['/auctions']), 1500);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMsg = err.error?.message || 'Something went wrong.';
        }
      });
  }
}