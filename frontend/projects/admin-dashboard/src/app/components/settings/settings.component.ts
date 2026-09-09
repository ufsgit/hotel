import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../services/admin-api.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html'
})
export class SettingsComponent implements OnInit {
  isLoading    = true;
  isSaving     = false;
  isUploading  = false;
  successMsg   = '';
  errorMsg     = '';
  uploadError  = '';

  // Preview shown before/after upload
  logoPreview: string | null = null;
  selectedFile: File | null = null;
  isDragging = false;

  formData: any = {
    name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    branding_logo_url: '',
    branding_primary_color: '#008cff',
    timezone: 'UTC'
  };

  timezones = [
    'UTC', 'Asia/Kolkata', 'America/New_York', 'America/Chicago',
    'America/Denver', 'America/Los_Angeles', 'Europe/London',
    'Europe/Paris', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Singapore',
    'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland'
  ];

  constructor(private api: AdminApiService) {}

  ngOnInit(): void {
    this.api.getHotelSettings().subscribe({
      next: (data) => {
        this.formData = { ...data };
        if (data.branding_logo_url) this.logoPreview = data.branding_logo_url;
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to load hotel settings.';
        this.isLoading = false;
      }
    });
  }

  // ── File selection ──────────────────────────────────────────────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) this.prepareFile(input.files[0]);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(): void { this.isDragging = false; }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.prepareFile(file);
  }

  private prepareFile(file: File): void {
    this.uploadError = '';
    if (!file.type.startsWith('image/')) {
      this.uploadError = 'Please upload an image file (JPG, PNG, GIF, WebP).';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.uploadError = 'File is too large. Maximum size is 5 MB.';
      return;
    }
    this.selectedFile = file;
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => this.logoPreview = e.target?.result as string;
    reader.readAsDataURL(file);
  }

  // ── Upload to server ────────────────────────────────────────────────────────
  uploadLogo(): void {
    if (!this.selectedFile) return;
    this.isUploading = true;
    this.uploadError = '';

    this.api.uploadLogo(this.selectedFile).subscribe({
      next: (res) => {
        this.formData.branding_logo_url = res.url;
        this.logoPreview = res.url;
        this.selectedFile = null;
        this.isUploading = false;
        this.successMsg = '✅ Logo uploaded successfully!';
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: () => {
        this.isUploading = false;
        this.uploadError = 'Upload failed. Please try again.';
      }
    });
  }

  removeLogo(): void {
    this.logoPreview = null;
    this.selectedFile = null;
    this.formData.branding_logo_url = '';
  }

  // ── Save all settings ───────────────────────────────────────────────────────
  save(): void {
    this.isSaving = true;
    this.successMsg = '';
    this.errorMsg = '';

    this.api.updateHotelSettings(this.formData).subscribe({
      next: () => {
        this.isSaving = false;
        this.successMsg = '✅ Hotel settings saved successfully!';
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: () => {
        this.isSaving = false;
        this.errorMsg = '❌ Failed to save settings. Please try again.';
      }
    });
  }
}
