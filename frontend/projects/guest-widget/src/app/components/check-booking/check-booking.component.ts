import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-check-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './check-booking.component.html',
  styleUrl: './check-booking.component.css'
})
export class CheckBookingComponent implements OnInit {
  hotelSlug: string = '';
  bookingId: string = '';
  guestEmail: string = '';
  
  isLoading: boolean = false;
  isCancelling: boolean = false;
  error: string = '';
  successMsg: string = '';
  
  bookingDetails: any = null;
  hotelData: any = null;
  platformDefaultColor = '#6366f1';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    // Fetch platform default color for fallback
    this.api.getPlatformBranding().subscribe({
      next: (b) => { this.platformDefaultColor = b.default_primary_color || '#6366f1'; },
      error: () => { /* keep default */ }
    });

    this.route.queryParams.subscribe(params => {
      if (params['hotel']) {
        this.hotelSlug = params['hotel'];
        this.loadHotel();
      }
    });
  }

  get effectivePrimaryColor(): string {
    return this.hotelData?.branding_primary_color || this.platformDefaultColor;
  }

  loadHotel(): void {
    this.api.getHotelInfo(this.hotelSlug).subscribe({
      next: (res) => {
        this.hotelData = res;
      },
      error: () => {
        this.error = 'Failed to load hotel settings.';
      }
    });
  }

  checkStatus(): void {
    if (!this.bookingId || !this.guestEmail) {
      this.error = 'Please enter both Booking ID and Email.';
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.successMsg = '';
    this.bookingDetails = null;

    this.api.checkBookingStatus(this.hotelSlug, {
      booking_id: parseInt(this.bookingId, 10),
      guest_email: this.guestEmail
    }).subscribe({
      next: (res) => {
        this.bookingDetails = res;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to fetch booking details.';
        this.isLoading = false;
      }
    });
  }

  canCancel(): boolean {
    if (!this.hotelData || !this.bookingDetails) return false;
    const s = this.bookingDetails.booking_status;
    
    if (s === 'cancelled' || s === 'checked_out' || s === 'checked_in' || this.hotelData.cancellation_allowed !== 1) {
        return false;
    }

    const checkInDate = new Date(this.bookingDetails.check_in_date);
    const today = new Date();
    const diffTime = checkInDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return false;
    }

    if (this.hotelData.min_days_before_cancel && diffDays < this.hotelData.min_days_before_cancel) {
        return false;
    }

    return true;
  }

  get cancellationFeeText(): string {
    if (!this.hotelData) return '';
    if (this.hotelData.cancellation_fee_type === 'percentage') {
      return `A cancellation fee of ${this.hotelData.cancellation_fee}% of the total amount will apply.`;
    } else {
      return `A flat cancellation fee of ₹${this.hotelData.cancellation_fee} will apply.`;
    }
  }

  cancelBooking(): void {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) return;
    
    this.isCancelling = true;
    this.error = '';
    
    this.api.cancelBooking(this.hotelSlug, {
      booking_id: this.bookingDetails.id,
      guest_email: this.guestEmail
    }).subscribe({
      next: (res) => {
        this.isCancelling = false;
        this.successMsg = res.message;
        // Refresh status
        this.checkStatus();
      },
      error: (err) => {
        this.isCancelling = false;
        this.error = err.error?.error || 'Failed to cancel booking.';
      }
    });
  }
}
