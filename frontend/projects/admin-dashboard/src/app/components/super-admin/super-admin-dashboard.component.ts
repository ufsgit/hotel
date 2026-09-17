import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperAdminApiService } from '../../services/superadmin-api.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrl: './super-admin-dashboard.component.css'
})
export class SuperAdminDashboardComponent implements OnInit {

  activeTab: 'overview' | 'hotels' | 'users' | 'settings' = 'overview';

  // ── Data ──────────────────────────────────────────────────────────────────
  hotels: any[] = [];
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  topHotels: any[] = [];
  recentBookings: any[] = [];
  platformStats: any = null;
  platformSettings: any = null;

  // ── Loading / Error ───────────────────────────────────────────────────────
  isLoading = true;
  usersLoading = false;
  settingsLoading = false;
  error = '';
  successMsg = '';
  errorMsg = '';

  // ── Create Hotel modal ────────────────────────────────────────────────────
  showHotelModal = false;
  editingHotel: any = null;
  hotelForm = { name: '', address: '', contact_email: '', contact_phone: '', branding_primary_color: '#6366f1' };
  hotelSubmitting = false;
  hotelError = '';

  // ── Create Admin modal ────────────────────────────────────────────────────
  showAdminModal = false;
  adminForm = { name: '', email: '', password: '', hotel_id: 0, hotel_name: '' };
  adminSubmitting = false;
  adminError = '';

  // ── View Staff panel ──────────────────────────────────────────────────────
  showStaffPanel = false;
  staffPanelHotel: any = null;
  staffList: any[] = [];
  staffLoading = false;

  // ── Reset Password modal ──────────────────────────────────────────────────
  showResetModal = false;
  resetUser: any = null;
  newPassword = '';
  resetSubmitting = false;
  resetError = '';

  // ── Delete confirmation ───────────────────────────────────────────────────
  showDeleteHotelConfirm = false;
  hotelToDelete: any = null;
  showDeleteUserConfirm = false;
  userToDelete: any = null;

  // ── User filter ───────────────────────────────────────────────────────────
  userSearch = '';
  userHotelFilter = '';

  // ── Copy slug ─────────────────────────────────────────────────────────────
  copiedSlug: string | null = null;

  // ── Platform Settings ─────────────────────────────────────────────────────
  settingsForm: any = {};
  settingsSaving = false;
  showSmtpPass = false;
  showTwilioToken = false;

  constructor(private api: SuperAdminApiService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.setTab(params['tab']);
      } else {
        this.loadOverview();
      }
    });
  }

  setTab(tab: 'overview' | 'hotels' | 'users' | 'settings'): void {
    this.activeTab = tab;
    this.successMsg = '';
    this.errorMsg = '';
    if (tab === 'overview' && !this.platformStats) this.loadOverview();
    if (tab === 'hotels' && this.hotels.length === 0) this.loadHotels();
    if (tab === 'users' && this.allUsers.length === 0) this.loadUsers();
    if (tab === 'settings' && !this.platformSettings) this.loadSettings();
  }

  // ── Overview ───────────────────────────────────────────────────────────────
  loadOverview(): void {
    this.isLoading = true;
    this.api.getPlatformStats().subscribe({ next: s => { this.platformStats = s; }, error: () => {} });
    this.api.getTopHotels().subscribe({ next: h => { this.topHotels = h; }, error: () => {} });
    this.api.getRecentBookings().subscribe({
      next: b => { this.recentBookings = b; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
    if (this.hotels.length === 0) this.loadHotels();
  }

  // ── Hotels ─────────────────────────────────────────────────────────────────
  loadHotels(): void {
    this.api.getHotels().subscribe({
      next: data => { this.hotels = data; },
      error: err => { this.error = err.error?.error || 'Failed to load hotels.'; }
    });
  }

  openCreateHotelModal(): void {
    this.editingHotel = null;
    this.hotelForm = { name: '', address: '', contact_email: '', contact_phone: '', branding_primary_color: '#6366f1' };
    this.hotelError = '';
    this.showHotelModal = true;
  }

  openEditHotelModal(hotel: any): void {
    this.editingHotel = hotel;
    this.hotelForm = {
      name: hotel.name, address: hotel.address || '', contact_email: hotel.contact_email || '',
      contact_phone: hotel.contact_phone || '', branding_primary_color: hotel.branding_primary_color || '#6366f1'
    };
    this.hotelError = '';
    this.showHotelModal = true;
  }

  closeHotelModal(): void { this.showHotelModal = false; }

  submitHotel(): void {
    if (!this.hotelForm.name.trim()) { this.hotelError = 'Hotel name is required.'; return; }
    this.hotelSubmitting = true;
    this.hotelError = '';
    const obs = this.editingHotel
      ? this.api.updateHotel(this.editingHotel.id, this.hotelForm)
      : this.api.createHotel(this.hotelForm);
    obs.subscribe({
      next: () => {
        this.hotelSubmitting = false;
        this.showHotelModal = false;
        this.loadHotels();
        this.showSuccess(this.editingHotel ? 'Hotel updated!' : 'Hotel created!');
      },
      error: err => { this.hotelError = err.error?.error || 'Failed.'; this.hotelSubmitting = false; }
    });
  }

  toggleSuspend(hotel: any): void {
    const action = hotel.is_suspended ? 'activate' : 'suspend';
    if (!confirm(`Are you sure you want to ${action} "${hotel.name}"?`)) return;
    this.api.suspendHotel(hotel.id).subscribe({
      next: res => { hotel.is_suspended = res.is_suspended; this.showSuccess(res.message); },
      error: err => this.showError(err.error?.error || 'Failed.')
    });
  }

  confirmDeleteHotel(hotel: any): void { this.hotelToDelete = hotel; this.showDeleteHotelConfirm = true; }
  cancelDeleteHotel(): void { this.showDeleteHotelConfirm = false; this.hotelToDelete = null; }
  executeDeleteHotel(): void {
    this.api.deleteHotel(this.hotelToDelete.id).subscribe({
      next: () => {
        this.hotels = this.hotels.filter(h => h.id !== this.hotelToDelete.id);
        this.showDeleteHotelConfirm = false;
        this.hotelToDelete = null;
        this.showSuccess('Hotel deleted successfully.');
      },
      error: err => this.showError(err.error?.error || 'Failed to delete hotel.')
    });
  }

  // ── Staff Panel ────────────────────────────────────────────────────────────
  openStaffPanel(hotel: any): void {
    this.staffPanelHotel = hotel;
    this.showStaffPanel = true;
    this.staffLoading = true;
    this.api.getHotelUsers(hotel.id).subscribe({
      next: users => { this.staffList = users; this.staffLoading = false; },
      error: () => { this.staffLoading = false; }
    });
  }
  closeStaffPanel(): void { this.showStaffPanel = false; this.staffPanelHotel = null; }

  // ── Admin Modal ────────────────────────────────────────────────────────────
  openAdminModal(hotel: any): void {
    this.adminForm = { name: '', email: '', password: '', hotel_id: hotel.id, hotel_name: hotel.name };
    this.adminError = '';
    this.showAdminModal = true;
  }
  closeAdminModal(): void { this.showAdminModal = false; }
  submitAdmin(): void {
    if (!this.adminForm.name || !this.adminForm.email || !this.adminForm.password) {
      this.adminError = 'All fields are required.'; return;
    }
    this.adminSubmitting = true;
    this.adminError = '';
    this.api.createHotelAdmin({ name: this.adminForm.name, email: this.adminForm.email, password: this.adminForm.password, hotel_id: this.adminForm.hotel_id }).subscribe({
      next: () => {
        this.adminSubmitting = false;
        this.showAdminModal = false;
        this.showSuccess('Hotel Admin created!');
        if (this.showStaffPanel && this.staffPanelHotel?.id === this.adminForm.hotel_id) {
          this.openStaffPanel(this.staffPanelHotel);
        }
      },
      error: err => { this.adminError = err.error?.error || 'Failed.'; this.adminSubmitting = false; }
    });
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  loadUsers(): void {
    this.usersLoading = true;
    this.api.getAllUsers().subscribe({
      next: users => { this.allUsers = users; this.applyUserFilter(); this.usersLoading = false; },
      error: () => { this.usersLoading = false; }
    });
  }

  applyUserFilter(): void {
    let list = [...this.allUsers];
    if (this.userSearch) {
      const q = this.userSearch.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (this.userHotelFilter) {
      list = list.filter(u => u.hotel_name === this.userHotelFilter);
    }
    this.filteredUsers = list;
  }

  get uniqueHotelNames(): string[] {
    return [...new Set(this.allUsers.map(u => u.hotel_name).filter(Boolean))];
  }

  // ── Reset Password ─────────────────────────────────────────────────────────
  openResetModal(user: any): void { this.resetUser = user; this.newPassword = ''; this.resetError = ''; this.showResetModal = true; }
  closeResetModal(): void { this.showResetModal = false; this.resetUser = null; }
  submitReset(): void {
    if (!this.newPassword || this.newPassword.length < 6) { this.resetError = 'Password must be at least 6 characters.'; return; }
    this.resetSubmitting = true;
    this.api.resetUserPassword(this.resetUser.id, this.newPassword).subscribe({
      next: () => { this.resetSubmitting = false; this.showResetModal = false; this.showSuccess('Password reset successfully!'); },
      error: err => { this.resetError = err.error?.error || 'Failed.'; this.resetSubmitting = false; }
    });
  }

  // ── Delete User ────────────────────────────────────────────────────────────
  confirmDeleteUser(user: any): void { this.userToDelete = user; this.showDeleteUserConfirm = true; }
  cancelDeleteUser(): void { this.showDeleteUserConfirm = false; this.userToDelete = null; }
  executeDeleteUser(): void {
    this.api.deleteUser(this.userToDelete.id).subscribe({
      next: () => {
        this.allUsers = this.allUsers.filter(u => u.id !== this.userToDelete.id);
        if (this.showStaffPanel) this.staffList = this.staffList.filter(u => u.id !== this.userToDelete.id);
        this.applyUserFilter();
        this.showDeleteUserConfirm = false;
        this.userToDelete = null;
        this.showSuccess('User deleted successfully.');
      },
      error: err => this.showError(err.error?.error || 'Failed.')
    });
  }

  // ── Impersonate ────────────────────────────────────────────────────────────
  impersonate(user: any): void {
    if (!confirm(`Login as "${user.name}" (${user.email})? This will open a new tab with their admin session.`)) return;
    this.api.impersonateUser(user.id).subscribe({
      next: res => {
        const url = `http://localhost:4200?impersonate_token=${res.token}`;
        window.open(url, '_blank');
      },
      error: err => this.showError(err.error?.error || 'Failed to impersonate.')
    });
  }

  // ── Platform Settings ──────────────────────────────────────────────────────
  loadSettings(): void {
    this.settingsLoading = true;
    this.api.getPlatformSettings().subscribe({
      next: s => { this.platformSettings = s; this.settingsForm = { ...s }; this.settingsLoading = false; },
      error: () => { this.settingsLoading = false; }
    });
  }

  saveSettings(): void {
    this.settingsSaving = true;
    this.api.updatePlatformSettings(this.settingsForm).subscribe({
      next: () => { this.settingsSaving = false; this.showSuccess('Platform settings saved!'); },
      error: err => { this.settingsSaving = false; this.showError(err.error?.error || 'Failed to save settings.'); }
    });
  }

  // ── Widget URL ─────────────────────────────────────────────────────────────
  copyWidgetUrl(hotel: any): void {
    const url = `http://localhost:4201/?hotel=${hotel.uuid}`;
    navigator.clipboard.writeText(url).then(() => { this.copiedSlug = hotel.uuid; setTimeout(() => this.copiedSlug = null, 2000); });
  }
  getWidgetUrl(hotel: any): string { return `http://localhost:4201?hotel=${hotel.uuid}`; }

  // ── Helpers ────────────────────────────────────────────────────────────────
  showSuccess(msg: string): void { this.successMsg = msg; this.errorMsg = ''; setTimeout(() => this.successMsg = '', 4000); }
  showError(msg: string): void { this.errorMsg = msg; setTimeout(() => this.errorMsg = '', 5000); }

  formatCurrency(v: any): string { return '₹' + (parseFloat(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

  getStatusColor(status: string): string {
    const map: any = { pending: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-blue-100 text-blue-800', checked_in: 'bg-green-100 text-green-800', checked_out: 'bg-gray-100 text-gray-700', cancelled: 'bg-red-100 text-red-800' };
    return map[status] || 'bg-gray-100 text-gray-700';
  }
}
