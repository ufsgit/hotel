import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService } from '../../services/admin-api.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html'
})
export class CalendarComponent implements OnInit {
  bookings: any[] = [];
  isLoading = true;
  
  // MVP Calendar Logic
  days: number[] = Array.from({length: 30}, (_, i) => i + 1);
  rooms: string[] = ['Deluxe Ocean View', 'Presidential Suite']; // In reality, fetch from API

  constructor(private api: AdminApiService) {}

  ngOnInit(): void {
    this.api.getCalendar().subscribe({
      next: (data) => {
        this.bookings = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load calendar', err);
        this.isLoading = false;
      }
    });
  }

  // Simplified helper to check if a room has a booking on a specific day index
  hasBooking(room: string, dayIndex: number): any {
    // For MVP, just randomly assign bookings based on hash of room+day to mock real calendar view if no real data
    // If real data exists, we would map it.
    const actualBooking = this.bookings.find(b => b.room_type === room && new Date(b.check_in_date).getDate() === dayIndex);
    return actualBooking ? actualBooking : null;
  }
}
