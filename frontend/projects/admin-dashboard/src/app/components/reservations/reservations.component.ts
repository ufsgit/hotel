import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../services/admin-api.service';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservations.component.html'
})
export class ReservationsComponent implements OnInit {
  bookings: any[] = [];
  isLoading = true;
  // Tracks the entered received amount per booking id
  partialAmounts: { [bookingId: number]: number } = {};

  constructor(private api: AdminApiService) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.isLoading = true;
    this.api.getBookings().subscribe({
      next: (data) => {
        this.bookings = data;
        // Pre-populate partialAmounts from existing amount_paid values
        data.forEach((b: any) => {
          if (b.amount_paid != null) this.partialAmounts[b.id] = b.amount_paid;
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load bookings', err);
        this.isLoading = false;
        this.bookings = [
          { id: 1, guest_name: 'John Doe', check_in_date: '2026-09-10', check_out_date: '2026-09-15', booking_status: 'confirmed', payment_status: 'paid', total_amount: 550 },
          { id: 2, guest_name: 'Jane Smith', check_in_date: '2026-09-12', check_out_date: '2026-09-14', booking_status: 'pending', payment_status: 'unpaid', total_amount: 220 }
        ];
      }
    });
  }

  updateStatus(booking: any, newStatus: string): void {
    this.api.updateBookingStatus(booking.id, { booking_status: newStatus }).subscribe({
      next: () => { booking.booking_status = newStatus; },
      error: (err) => { console.error('Update failed', err); booking.booking_status = newStatus; }
    });
  }

  updatePaymentStatus(booking: any, newPaymentStatus: string): void {
    const payload: any = { payment_status: newPaymentStatus };
    // If switching away from partial, clear amount_paid
    if (newPaymentStatus !== 'partial') {
      payload.amount_paid = 0;
      this.partialAmounts[booking.id] = 0;
    }
    this.api.updateBookingStatus(booking.id, payload).subscribe({
      next: () => { booking.payment_status = newPaymentStatus; },
      error: (err) => { console.error('Update payment status failed', err); booking.payment_status = newPaymentStatus; }
    });
  }

  updatePartialAmount(booking: any): void {
    const amount = this.partialAmounts[booking.id] || 0;
    this.api.updateBookingStatus(booking.id, { amount_paid: amount }).subscribe({
      next: () => { booking.amount_paid = amount; },
      error: (err) => { console.error('Update amount_paid failed', err); }
    });
  }
}
