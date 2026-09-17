import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../services/admin-api.service';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff.component.html'
})
export class StaffComponent implements OnInit {
  staffList: any[] = [];
  myHotels: any[] = [];
  activeHotelId = localStorage.getItem('active_hotel_id');
  isLoading = true;

  showModal = false;
  isSubmitting = false;
  errorMsg = '';
  successMsg = '';

  newStaff = {
    name: '',
    email: '',
    password: '',
    target_hotel_id: '',
    permissions: [] as string[]
  };

  availablePermissions = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'reservations', label: 'Reservations' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'offers', label: 'Seasons & Offers' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' }
  ];

  editingStaffId: number | null = null;

  constructor(private api: AdminApiService) {}

  ngOnInit(): void {
    this.loadStaff();
    this.loadMyHotels();
  }

  loadMyHotels() {
    this.api.getMyHotels().subscribe({
      next: (data) => {
        this.myHotels = data.filter((h: any) => h.role === 'owner');
      }
    });
  }

  loadStaff() {
    this.isLoading = true;
    this.api.getStaff().subscribe({
      next: (data) => {
        this.staffList = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  openModal(staff: any = null) {
    this.errorMsg = '';
    this.showModal = true;
    if (staff) {
      this.editingStaffId = staff.id;
      this.newStaff = { 
        name: staff.name, 
        email: staff.email, 
        password: '', 
        target_hotel_id: this.activeHotelId || '',
        permissions: (staff.permissions && Array.isArray(staff.permissions)) ? [...staff.permissions] : (staff.permissions ? JSON.parse(staff.permissions) : [])
      };
    } else {
      this.editingStaffId = null;
      this.newStaff = { name: '', email: '', password: '', target_hotel_id: this.activeHotelId || '', permissions: [] };
    }
  }

  togglePermission(permId: string) {
    const idx = this.newStaff.permissions.indexOf(permId);
    if (idx > -1) {
      this.newStaff.permissions.splice(idx, 1);
    } else {
      this.newStaff.permissions.push(permId);
    }
  }

  closeModal() {
    this.showModal = false;
  }

  addStaff() {
    if (!this.newStaff.name || !this.newStaff.email || (!this.editingStaffId && !this.newStaff.password)) {
      this.errorMsg = 'Please fill all required fields.';
      return;
    }

    this.isSubmitting = true;
    this.errorMsg = '';

    const request = this.editingStaffId
      ? this.api.updateStaff(this.editingStaffId, this.newStaff)
      : this.api.addStaff(this.newStaff);

    request.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeModal();
        this.successMsg = this.editingStaffId ? 'Staff member updated successfully!' : 'Staff member added successfully!';
        this.loadStaff();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMsg = err.error?.error || 'Failed to save staff.';
      }
    });
  }

  removeStaff(staff: any) {
    if (confirm(`Are you sure you want to remove ${staff.name} from this property?`)) {
      this.api.removeStaff(staff.id).subscribe({
        next: () => {
          this.successMsg = 'Staff member removed successfully!';
          this.loadStaff();
          setTimeout(() => this.successMsg = '', 3000);
        },
        error: (err) => {
          alert(err.error?.error || 'Failed to remove staff.');
        }
      });
    }
  }
}
