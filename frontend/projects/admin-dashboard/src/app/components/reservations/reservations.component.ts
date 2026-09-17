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
  searchTerm: string = '';
  isLoading = true;
  // Tracks the entered received amount per booking id
  partialAmounts: { [bookingId: number]: number } = {};

  // Guest details modal state
  selectedGuestBooking: any = null;
  isGuestModalOpen = false;
  isUploadingDoc = false;
  uploadDocError = '';

  constructor(private api: AdminApiService) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  get filteredBookings(): any[] {
    if (!this.searchTerm.trim()) {
      return this.bookings;
    }
    const term = this.searchTerm.toLowerCase();
    return this.bookings.filter(b => 
      (b.guest_name && b.guest_name.toLowerCase().includes(term)) ||
      (b.id && `bkg-${b.id}`.includes(term)) || 
      (b.id && b.id.toString().includes(term))
    );
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

  // --- GUEST MODAL LOGIC ---
  openGuestModal(booking: any): void {
    this.selectedGuestBooking = booking;
    this.isGuestModalOpen = true;
    this.uploadDocError = '';
  }

  closeGuestModal(): void {
    this.isGuestModalOpen = false;
    this.selectedGuestBooking = null;
  }

  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 10 * 1024 * 1024) {
        this.uploadDocError = 'File is too large. Maximum size is 10 MB.';
        return;
      }
      this.isUploadingDoc = true;
      this.uploadDocError = '';
      this.api.uploadGuestDocument(this.selectedGuestBooking.id, file).subscribe({
        next: (res) => {
          this.selectedGuestBooking.guest_document_url = res.url;
          this.isUploadingDoc = false;
        },
        error: () => {
          this.isUploadingDoc = false;
          this.uploadDocError = 'Upload failed. Please try again.';
        }
      });
    }
  }
}
