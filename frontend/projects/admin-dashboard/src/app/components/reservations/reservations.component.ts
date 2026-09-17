import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../services/admin-api.service';
import { GuestDetailsModalComponent } from '../guest-details-modal/guest-details-modal.component';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule, GuestDetailsModalComponent],
  templateUrl: './reservations.component.html'
})
export class ReservationsComponent implements OnInit {
  bookings: any[] = [];
  searchTerm: string = '';
  isLoading = true;
  currentPage = 1;
  pageSize = 10;
  totalBookings = 0;
  totalPages = 0;
  
  // Tracks the entered received amount per booking id
  partialAmounts: { [bookingId: number]: number } = {};
  
  // Debounce timer for search
  private searchTimeout: any;

  // Guest Details Modal
  isGuestModalOpen = false;
  selectedGuestBooking: any = null;

  // History Modal State
  isHistoryModalOpen = false;
  selectedBookingHistory: any[] = [];
  isHistoryLoading = false;
  activeHistoryTab: 'booking' | 'payment' = 'booking';

  constructor(private api: AdminApiService) {}

  get filteredBookingHistory(): any[] {
    return this.selectedBookingHistory.filter(h => h.status_type === this.activeHistoryTab);
  }

  ngOnInit(): void {
    this.loadBookings();
  }

  onSearchChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.loadBookings();
    }, 300);
  }

  loadBookings(): void {
    this.isLoading = true;
    this.api.getBookings(this.currentPage, this.pageSize, this.searchTerm).subscribe({
      next: (res) => {
        this.bookings = res.data;
        this.totalBookings = res.total;
        this.totalPages = res.totalPages;
        // Pre-populate partialAmounts from existing amount_paid values
        res.data.forEach((b: any) => {
          if (b.amount_paid != null) this.partialAmounts[b.id] = b.amount_paid;
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load bookings', err);
        this.isLoading = false;
        this.bookings = [];
      }
    });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadBookings();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadBookings();
    }
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
  }

  closeGuestModal(): void {
    this.isGuestModalOpen = false;
    this.selectedGuestBooking = null;
  }

  // Document upload logic moved to GuestDetailsModalComponent

  // --- HISTORY LOGIC ---
  openHistoryModal(booking: any): void {
    this.isHistoryModalOpen = true;
    this.isHistoryLoading = true;
    this.selectedBookingHistory = [];
    
    this.api.getBookingHistory(booking.id).subscribe({
      next: (data) => {
        this.selectedBookingHistory = data;
        this.isHistoryLoading = false;
      },
      error: (err) => {
        console.error('Failed to load history', err);
        this.isHistoryLoading = false;
      }
    });
  }

  closeHistoryModal(): void {
    this.isHistoryModalOpen = false;
    this.selectedBookingHistory = [];
  }
}
