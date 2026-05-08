import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import flatpickr from 'flatpickr';

@Component({
  selector: 'app-create-auction',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Navbar],
  templateUrl: './create-auction.html',
  styleUrl: './create-auction.css'
})
export class CreateAuctionComponent implements AfterViewInit {

  form = {
    title: '',
    description: '',
    startingPrice: null as number | null,
    startTime: '',
    endTime: '',
    imageUrl: '' 
  };

  uploadMethod: 'url' | 'local' = 'url';
  selectedFile: File | null = null;
  isSubmitting = false;
  isUploadingImage = false;
  errorMsg = '';
  successMsg = '';

  // 🔥 Grab the HTML elements for Flatpickr
  @ViewChild('startPicker') startPicker!: ElementRef;
  @ViewChild('endPicker') endPicker!: ElementRef;

  constructor(private http: HttpClient, private router: Router) {}

  // 🔥 Initialize Flatpickr after view loads
  ngAfterViewInit() {
    if (this.startPicker && this.endPicker) {
      flatpickr(this.startPicker.nativeElement, {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        minDate: "today",
        defaultDate: new Date(), // 🔥 SENSEI FIX: Sets to current date/time automatically
        onChange: (selectedDates, dateStr) => {
          this.form.startTime = dateStr;
        }
      });

      flatpickr(this.endPicker.nativeElement, {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        minDate: "today",
        defaultDate: new Date(), // 🔥 SENSEI FIX: Sets to current date/time automatically
        onChange: (selectedDates, dateStr) => {
          this.form.endTime = dateStr;
        }
      });
    }
  }

  toggleUploadMethod() {
    this.uploadMethod = this.uploadMethod === 'url' ? 'local' : 'url';
    this.form.imageUrl = '';
    this.selectedFile = null;
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  submit() {
    if (!this.form.title || !this.form.startingPrice || !this.form.startTime || !this.form.endTime) {
      this.errorMsg = 'All fields are required.';
      return;
    }

    this.isSubmitting = true;
    this.errorMsg = '';

    if (this.uploadMethod === 'local' && this.selectedFile) {
      this.isUploadingImage = true;
      const formData = new FormData();
      formData.append('file', this.selectedFile);

      const token = localStorage.getItem('token');
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

      this.http.post<any>('http://localhost:8080/api/v1/images/upload', formData, { headers })
        .subscribe({
          next: (res) => {
            this.isUploadingImage = false;
            this.form.imageUrl = res.url; // MinIO URL
            this.createAuction();
          },
          error: (err) => {
            this.isUploadingImage = false;
            this.isSubmitting = false;
            this.errorMsg = 'Image upload failed: ' + (err.error?.message || 'Check MinIO connection.');
          }
        });
    } else {
      this.createAuction();
    }
  }

  private createAuction() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const payload = {
      title: this.form.title,
      description: this.form.description,
      startingPrice: this.form.startingPrice,
      startTime: this.form.startTime.replace(' ', 'T') + ':00',  
      endTime: this.form.endTime.replace(' ', 'T') + ':00',
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
          this.errorMsg = err.error?.message || 'Something went wrong while creating auction.';
        }
      });
  }
}