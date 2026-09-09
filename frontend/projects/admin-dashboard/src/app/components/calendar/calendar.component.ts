import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../services/admin-api.service';

interface CalendarDay {
  date: Date;
  dayNumber: number;
  dayName: string;
  dateStr: string; // YYYY-MM-DD
  isToday: boolean;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html'
})
export class CalendarComponent implements OnInit {
  roomTypes: any[] = [];
  bookings: any[] = [];
  isLoading = true;

  currentYear: number = new Date().getFullYear();
  currentMonth: number = new Date().getMonth(); // 0-indexed (0 = Jan, 8 = Sep)
  monthDays: CalendarDay[] = [];

  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  selectedBooking: any = null;

  constructor(private api: AdminApiService) {}

  ngOnInit(): void {
    this.generateCalendarDays();
    this.loadData();
  }

  generateCalendarDays(): void {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const days: CalendarDay[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(this.currentYear, this.currentMonth, d);
      const dateStr = date.toLocaleDateString('en-CA');
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({
        date,
        dayNumber: d,
        dayName,
        dateStr,
        isToday: dateStr === todayStr
      });
    }
    this.monthDays = days;
  }

  loadData(): void {
    this.isLoading = true;
    this.api.getRoomTypes().subscribe({
      next: (rooms) => {
        this.roomTypes = rooms;
        this.fetchBookings();
      },
      error: (err) => {
        console.error('Failed to load room types', err);
        this.roomTypes = [
          { id: 1, name: 'Standard Room' },
          { id: 2, name: 'Deluxe Suite' }
        ];
        this.fetchBookings();
      }
    });
  }

  fetchBookings(): void {
    this.api.getCalendar().subscribe({
      next: (data) => {
        this.bookings = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load calendar bookings', err);
        this.isLoading = false;
      }
    });
  }

  prevMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendarDays();
  }

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendarDays();
  }

  goToToday(): void {
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth();
    this.generateCalendarDays();
  }

  parseDateStr(dateVal: any): string {
    if (!dateVal) return '';
    return new Date(dateVal).toLocaleDateString('en-CA');
  }

  getBookingForRoomAndDay(room: any, dateStr: string): any {
    return this.bookings.find(b => {
      const matchRoom = (b.room_type_id && b.room_type_id === room.id) || 
                        (b.room_type && b.room_type.toLowerCase() === room.name.toLowerCase());
      if (!matchRoom) return false;

      const checkInStr = this.parseDateStr(b.check_in_date);
      const checkOutStr = this.parseDateStr(b.check_out_date);

      return dateStr >= checkInStr && dateStr <= checkOutStr;
    });
  }

  isFirstDayOfBooking(booking: any, dateStr: string): boolean {
    if (!booking) return false;
    return this.parseDateStr(booking.check_in_date) === dateStr;
  }

  selectBooking(booking: any): void {
    this.selectedBooking = booking;
  }

  closeModal(): void {
    this.selectedBooking = null;
  }
}
