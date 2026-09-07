import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-room-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './room-list.component.html'
})
export class RoomListComponent implements OnInit {
  hotelSlug = 'grand-oasis';
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
      this.fetchAvailability();
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
      }
    });
  }
}
