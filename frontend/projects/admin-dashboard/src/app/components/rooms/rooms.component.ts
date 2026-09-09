import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../services/admin-api.service';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rooms.component.html'
})
export class RoomsComponent implements OnInit {
  rooms: any[] = [];
  isLoading = true;

  showForm = false;
  isEditing = false;
  isUploading = false;
  customAmenityInput = '';

  availableAmenities: string[] = [
    'WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Balcony', 
    'City View', 'Ocean View', 'Safe Box', 'Coffee Maker', 
    'Room Service', 'Bathtub', 'Hair Dryer'
  ];

  formData: any = {
    name: '',
    description: '',
    base_price: 0,
    default_capacity: 2,
    max_capacity: 4,
    total_rooms: 10,
    extra_bed_allowed: false,
    extra_bed_price: 0,
    cover_image: '',
    amenities: []
  };

  constructor(private api: AdminApiService) {}

  ngOnInit(): void {
    this.loadRooms();
  }

  loadRooms(): void {
    this.isLoading = true;
    this.api.getRoomTypes().subscribe({
      next: (data) => {
        this.rooms = data;
        this.refreshAvailableAmenities();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load rooms', err);
        this.isLoading = false;
      }
    });
  }

  parseAmenities(amenities: any): string[] {
    if (!amenities) return [];
    if (Array.isArray(amenities)) return amenities;
    if (typeof amenities === 'string') {
      try {
        const parsed = JSON.parse(amenities);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  refreshAvailableAmenities(): void {
    const set = new Set<string>(this.availableAmenities);
    for (const r of this.rooms) {
      const ams = this.parseAmenities(r.amenities);
      for (const a of ams) {
        if (a && typeof a === 'string') set.add(a.trim());
      }
    }
    this.availableAmenities = Array.from(set);
  }

  openNewForm(): void {
    this.isEditing = false;
    this.customAmenityInput = '';
    this.formData = { 
      name: '', 
      description: '', 
      base_price: 0, 
      default_capacity: 2, 
      max_capacity: 4, 
      total_rooms: 10,
      extra_bed_allowed: false,
      extra_bed_price: 0,
      cover_image: '',
      amenities: ['WiFi', 'TV', 'Air Conditioning']
    };
    this.showForm = true;
  }

  openEditForm(room: any): void {
    this.isEditing = true;
    this.customAmenityInput = '';
    let cover = '';
    if (room.photos) {
      if (Array.isArray(room.photos) && room.photos.length > 0) {
        cover = room.photos[0];
      } else if (typeof room.photos === 'string') {
        try {
          const parsed = JSON.parse(room.photos);
          cover = Array.isArray(parsed) ? parsed[0] : room.photos;
        } catch (e) {
          cover = room.photos;
        }
      }
    }

    const roomAmenities = this.parseAmenities(room.amenities);
    for (const a of roomAmenities) {
      if (!this.availableAmenities.includes(a)) {
        this.availableAmenities.push(a);
      }
    }

    this.formData = { 
      ...room, 
      cover_image: cover,
      amenities: [...roomAmenities]
    };
    this.showForm = true;
  }

  toggleAmenity(amenity: string): void {
    if (!this.formData.amenities) this.formData.amenities = [];
    const idx = this.formData.amenities.indexOf(amenity);
    if (idx > -1) {
      this.formData.amenities.splice(idx, 1);
    } else {
      this.formData.amenities.push(amenity);
    }
  }

  isAmenitySelected(amenity: string): boolean {
    return Array.isArray(this.formData.amenities) && this.formData.amenities.includes(amenity);
  }

  addCustomAmenity(): void {
    const trimmed = this.customAmenityInput.trim();
    if (!trimmed) return;
    if (!this.formData.amenities) this.formData.amenities = [];
    if (!this.formData.amenities.includes(trimmed)) {
      this.formData.amenities.push(trimmed);
    }
    if (!this.availableAmenities.includes(trimmed)) {
      this.availableAmenities.push(trimmed);
    }
    this.customAmenityInput = '';
  }

  removeAmenity(amenity: string): void {
    if (!this.formData.amenities) return;
    const idx = this.formData.amenities.indexOf(amenity);
    if (idx > -1) {
      this.formData.amenities.splice(idx, 1);
    }
  }

  cancelForm(): void {
    this.showForm = false;
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.isUploading = true;
      this.api.uploadRoomPhoto(file).subscribe({
        next: (res) => {
          this.formData.cover_image = res.url;
          this.isUploading = false;
        },
        error: (err) => {
          console.error('Upload failed', err);
          this.isUploading = false;
          alert('Failed to upload image. Please try again.');
        }
      });
    }
  }

  getRoomPhoto(room: any): string {
    if (room.photos) {
      if (Array.isArray(room.photos) && room.photos.length > 0) return room.photos[0];
      if (typeof room.photos === 'string') {
        try {
          const parsed = JSON.parse(room.photos);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
        } catch (e) {
          return room.photos;
        }
      }
    }
    return '';
  }

  saveRoom(): void {
    const payload = {
      ...this.formData,
      photos: this.formData.cover_image ? [this.formData.cover_image] : [],
      amenities: this.formData.amenities || []
    };

    if (this.isEditing) {
      this.api.updateRoomType(this.formData.id, payload).subscribe(() => {
        this.loadRooms();
        this.showForm = false;
      });
    } else {
      this.api.createRoomType(payload).subscribe(() => {
        this.loadRooms();
        this.showForm = false;
      });
    }
  }

  deleteRoom(id: number): void {
    if (confirm('Are you sure you want to delete this room?')) {
      this.api.deleteRoomType(id).subscribe(() => {
        this.loadRooms();
      });
    }
  }
}
