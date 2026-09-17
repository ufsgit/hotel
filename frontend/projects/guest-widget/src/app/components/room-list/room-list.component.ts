import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-room-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './room-list.component.html'
})
export class RoomListComponent implements OnInit {
  hotelSlug = '';
  rooms: any[] = [];
  checkIn: string = '';
  checkOut: string = '';
  guests: number = 2;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.checkIn = params['checkIn'];
      this.checkOut = params['checkOut'];
      this.guests = params['guests'] ? parseInt(params['guests'], 10) : 2;
      this.hotelSlug = params['hotel'] || '';
      if (this.hotelSlug) {
        this.fetchAvailability();
      }
    });
  }

  fetchAvailability(): void {
    this.isLoading = true;
    this.apiService.getAvailability(this.hotelSlug, this.checkIn, this.checkOut, this.guests)
      .subscribe({
        next: (data) => {
          this.rooms = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
        }
      });
  }

  bookRoom(room: any): void {
    this.router.navigate(['/book'], {
      queryParams: {
        roomTypeId: room.id,
        roomName: room.name,
        price: room.base_price,
        checkIn: this.checkIn,
        checkOut: this.checkOut,
        guests: this.guests
      },
      queryParamsHandling: 'merge'
    });
  }

  // Returns extra beds needed for this room given the selected guest count
  extraBedsFor(room: any): number {
    const defaultCap = room.default_capacity || room.max_occupancy || 2;
    return Math.max(0, this.guests - defaultCap);
  }

  // Returns total price per night including extra bed charges
  pricePerNightFor(room: any): number {
    const extraBeds = this.extraBedsFor(room);
    return parseFloat(room.base_price) + (extraBeds * parseFloat(room.extra_bed_price || 0));
  }
}
