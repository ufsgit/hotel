import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  hotelSlug = '';
  hotelName = 'our hotel';
  activeOffers: any[] = [];
  
  checkIn: string = '';
  checkOut: string = '';
  rooms: number = 1;
  guests: number = 2;

  constructor(private apiService: ApiService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.hotelSlug = params.get('hotel') || '';
      
      if (this.hotelSlug) {
        this.apiService.getActiveOffers(this.hotelSlug).subscribe({
          next: (offers) => { this.activeOffers = offers; },
          error: (err) => { console.error('Error fetching offers:', err); }
        });

        this.apiService.getHotelInfo(this.hotelSlug).subscribe({
          next: (info) => { this.hotelName = info.name || 'our hotel'; },
          error: (err) => { console.error('Error fetching hotel info:', err); }
        });
      }
    });
    // Set default dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    this.checkIn = today.toISOString().split('T')[0];
    this.checkOut = tomorrow.toISOString().split('T')[0];

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
        rooms: this.rooms,
        guests: this.guests
      },
      queryParamsHandling: 'merge'
    });
  }
}
