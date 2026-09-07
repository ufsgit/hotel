import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  hotelSlug = 'grand-oasis'; // Hardcoded for this demo widget
  activeOffers: any[] = [];
  
  checkIn: string = '';
  checkOut: string = '';
  guests: number = 2;

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit(): void {
    // Set default dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    this.checkIn = today.toISOString().split('T')[0];
    this.checkOut = tomorrow.toISOString().split('T')[0];

    this.apiService.getActiveOffers(this.hotelSlug).subscribe(
      (offers) => {
        this.activeOffers = offers;
      },
      (error) => {
        console.error('Error fetching offers:', error);
      }
    );
  }

  searchAvailability(): void {
    if (!this.checkIn || !this.checkOut || this.guests < 1) {
      alert('Please provide valid search details.');
      return;
    }
    this.router.navigate(['/rooms'], {
      queryParams: {
        checkIn: this.checkIn,
        checkOut: this.checkOut,
        guests: this.guests
      }
    });
  }
}
