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
  formData: any = {
    name: '',
    description: '',
    base_price: 0,
    default_capacity: 2,
    max_capacity: 4,
    extra_bed_allowed: false
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
    this.formData = { name: '', description: '', base_price: 0, default_capacity: 2, max_capacity: 4, extra_bed_allowed: false };
    this.showForm = true;
  }

  openEditForm(room: any): void {
    this.isEditing = true;
    this.formData = { ...room };
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
  }

  saveRoom(): void {
    if (this.isEditing) {
      this.api.updateRoomType(this.formData.id, this.formData).subscribe(() => {
        this.loadRooms();
        this.showForm = false;
      });
    } else {
      this.api.createRoomType(this.formData).subscribe(() => {
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
