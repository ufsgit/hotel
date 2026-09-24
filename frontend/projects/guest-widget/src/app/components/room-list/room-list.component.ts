import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-room-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './room-list.component.html'
})
export class RoomListComponent implements OnInit {
  hotelSlug = '';
  rooms: any[] = [];
  checkIn: string = '';
  checkOut: string = '';
  guests: number = 2;
  numRooms: number = 1;
  isLoading = true;

  // Modal State
  isDetailsModalOpen = false;
  selectedRoomDetails: any = null;

  // Offer Popup State
  activeOffer: any = null;
  showOfferPopup = false;

  // Mock Reviews (Keeping these for now, can be made dynamic later)
  mockReviews = [
    { name: 'Niladri Swain', type: 'ALL', date: 'Sep 23, 2026', rating: 5.0, text: 'Stay was good. The food served were amazing. The people in Qmin cafe were awesome people. They are very humble and polite. The food was good. The lift was secure. The room was clean and the housekeeping people are also good. They responded as asked. The true 4 star hotel' },
    { name: 'Rajesh Kapkoti', type: 'GROUP', date: 'Sep 22, 2026', rating: 4.0, text: 'Had a pleasant stay at Ginger Candolim. The rooms were clean and comfortable, and the staff were friendly and helpful throughout our stay. The location is convenient and a great choice for exploring Candolim and nearby places. Overall, we had a comfortable experience and would be happy to stay here again.' }
  ];

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
      this.numRooms = params['rooms'] ? parseInt(params['rooms'], 10) : 1;
      this.hotelSlug = params['hotel'] || '';
      if (this.hotelSlug) {
        this.fetchAvailability();
        this.fetchOffers();
      }
    });
  }

  searchAgain(): void {
    this.router.navigate(['/rooms'], {
      queryParams: {
        hotel: this.hotelSlug,
        checkIn: this.checkIn,
        checkOut: this.checkOut,
        rooms: this.numRooms,
        guests: this.guests
      }
    });
  }

  fetchAvailability(): void {
    this.isLoading = true;
    this.apiService.getAvailability(this.hotelSlug, this.checkIn, this.checkOut, this.guests, this.numRooms)
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

  fetchOffers(): void {
    this.apiService.getActiveOffers(this.hotelSlug).subscribe({
      next: (offers) => {
        if (offers && offers.length > 0) {
          const rushDeal = offers.find((o: any) => o.is_rush_deal === 1 || o.is_rush_deal === true);
          if (rushDeal) {
            this.activeOffer = rushDeal;
            this.showOfferPopup = true;
            // Auto dismiss after 5 seconds
            setTimeout(() => {
              this.showOfferPopup = false;
            }, 5000);
          }
        }
      }
    });
  }

  closeOfferPopup(): void {
    this.showOfferPopup = false;
  }

  bookRoom(room: any): void {
    document.body.style.overflow = 'auto';
    this.router.navigate(['/book'], {
      queryParams: {
        roomTypeId: room.id,
        roomName: room.name,
        price: room.base_price,
        checkIn: this.checkIn,
        checkOut: this.checkOut,
        guests: this.guests,
        rooms: this.numRooms
      },
      queryParamsHandling: 'merge'
    });
  }

  bookPackage(room: any, plan: any): void {
    const basePrice = parseFloat(room.base_price);
    const packagePrice = basePrice * plan.priceMultiplier;
    
    document.body.style.overflow = 'auto';
    this.router.navigate(['/book'], {
      queryParams: {
        roomTypeId: room.id,
        roomName: `${room.name} (${plan.name})`,
        price: packagePrice,
        rateMultiplier: plan.priceMultiplier,
        checkIn: this.checkIn,
        checkOut: this.checkOut,
        guests: this.guests,
        rooms: this.numRooms
      },
      queryParamsHandling: 'merge'
    });
  }

  openRoomDetails(room: any): void {
    this.selectedRoomDetails = room;
    this.isDetailsModalOpen = true;
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  closeRoomDetails(): void {
    this.isDetailsModalOpen = false;
    this.selectedRoomDetails = null;
    document.body.style.overflow = 'auto'; // Restore scrolling
  }

  // Returns true if this room type can physically hold the requested guests (incl. extra beds)
  canAccommodate(room: any): boolean {
    const maxPerRoom = (room.max_occupancy || 2) + (room.extra_bed_allowed ? room.extra_bed_allowed : 0);
    const totalMax = maxPerRoom * this.numRooms;
    return this.guests <= totalMax;
  }

  // Client-side filtered list: rooms that can actually hold current guests
  get filteredRooms(): any[] {
    return this.rooms.filter(r => this.canAccommodate(r));
  }

  // Returns total extra beds needed for all rooms given the selected guest count
  extraBedsFor(room: any): number {
    if (!room.extra_bed_allowed) return 0; // extra beds not allowed for this room type
    const totalDefaultCap = (room.default_capacity || room.max_occupancy || 2) * this.numRooms;
    const needed = Math.max(0, this.guests - totalDefaultCap);
    const maxAllowed = (room.extra_bed_allowed || 0) * this.numRooms; // max 1 (or N) extra bed per room
    return Math.min(needed, maxAllowed);
  }

  // Returns total price per night (for all rooms) including extra bed charges
  pricePerNightFor(room: any): number {
    const extraBeds = this.extraBedsFor(room);
    const baseTotal = parseFloat(room.base_price) * this.numRooms;
    return baseTotal + (extraBeds * parseFloat(room.extra_bed_price || 0));
  }

  // --- Dynamic Parsing Methods ---
  getDetailedAmenities(room: any): any {
    if (!room || !room.detailed_amenities) {
      return { popular: [], features: [], bathroom: [], safety: [], media: [] };
    }
    if (typeof room.detailed_amenities === 'string') {
      try {
        return JSON.parse(room.detailed_amenities);
      } catch (e) {
        return { popular: [], features: [], bathroom: [], safety: [], media: [] };
      }
    }
    return room.detailed_amenities;
  }

  getRatePlans(room: any): any[] {
    if (!room || !room.rate_plans) return [];
    if (typeof room.rate_plans === 'string') {
      try {
        return JSON.parse(room.rate_plans);
      } catch (e) {
        return [];
      }
    }
    return Array.isArray(room.rate_plans) ? room.rate_plans : [];
  }
}
