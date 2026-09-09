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
  formData: any = {
    name: '',
    description: '',
    base_price: 0,
    default_capacity: 2,
    max_capacity: 4,
    extra_bed_allowed: false,
    cover_image: ''
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
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load rooms', err);
        this.isLoading = false;
      }
    });
  }

  openNewForm(): void {
    this.isEditing = false;
    this.formData = { 
      name: '', 
      description: '', 
      base_price: 0, 
      default_capacity: 2, 
      max_capacity: 4, 
      extra_bed_allowed: false,
      cover_image: '' 
    };
    this.showForm = true;
  }

  openEditForm(room: any): void {
    this.isEditing = true;
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
    this.formData = { ...room, cover_image: cover };
    this.showForm = true;
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
      photos: this.formData.cover_image ? [this.formData.cover_image] : []
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
