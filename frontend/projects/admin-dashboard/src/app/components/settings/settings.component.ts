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
  showSecret = false;

  formData: any = {
    name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    branding_logo_url: '',
    branding_primary_color: '#008cff',
    timezone: 'UTC',
    tax_rate: 10,
    razorpay_key_id: '',
    razorpay_key_secret: ''
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

  saveSettings(): void {
    this.successMsg = '';
    this.errorMsg = '';
    this.isSaving = true;

    const payload: any = {
      tax_rate: this.formData.tax_rate,
      razorpay_key_id: this.formData.razorpay_key_id,
      razorpay_key_secret: this.formData.razorpay_key_secret,
      branding_primary_color: this.formData.branding_primary_color,
      branding_logo_url: this.formData.branding_logo_url
    };

    this.api.updateHotelSettings(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.successMsg = 'Settings saved successfully!';
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMsg = err?.error?.error || 'Failed to save settings.';
      }
    });
  }

  onLogoFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.isUploading = true;
    this.uploadError = '';

    this.api.uploadLogo(file).subscribe({
      next: (res) => {
        this.formData.branding_logo_url = res.url;
        this.logoPreview = res.url;
        this.isUploading = false;
      },
      error: () => {
        this.uploadError = 'Logo upload failed.';
        this.isUploading = false;
      }
    });
  }

  copyWidgetUrl(): void {
    const url = `http://localhost:4201/?hotel=${this.formData.uuid}`;
    navigator.clipboard.writeText(url).then(() => {
      this.successMsg = '✅ Widget URL copied to clipboard!';
      setTimeout(() => this.successMsg = '', 3000);
    });
  }
}
