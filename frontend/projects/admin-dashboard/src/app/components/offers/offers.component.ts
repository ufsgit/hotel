import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminApiService } from '../../services/admin-api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './offers.component.html'
})
export class OffersComponent implements OnInit {
  offers: any[] = [];
  isLoading  = true;
  isSaving   = false;
  formError  = '';
  pageError  = '';

  showForm  = false;
  isEditing = false;
  isUploading = false;

  emptyForm = () => ({
    name: '',
    description: '',
    banner_image_url: '',
    discount_type: 'percent',
    discount_value: 10,
    start_date: '',
    end_date: '',
    is_active: true,
    priority: 5
  });

  formData: any = this.emptyForm();

  constructor(private api: AdminApiService, private router: Router) {}

  ngOnInit(): void { this.loadOffers(); }

  loadOffers(): void {
    this.isLoading = true;
    this.api.getOffers().subscribe({
      next: (data) => { this.offers = data; this.isLoading = false; },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 400 || err.status === 401) {
          this.pageError = 'Session expired. Please log out and log back in.';
        }
      }
    });
  }

  openNewForm(): void {
    this.isEditing = false;
    this.formData = this.emptyForm();
    this.showForm = true;
  }

  openEditForm(offer: any): void {
    this.isEditing = true;
    // Format dates for date input
    this.formData = {
      ...offer,
      start_date: offer.start_date ? offer.start_date.split('T')[0] : '',
      end_date:   offer.end_date   ? offer.end_date.split('T')[0]   : ''
    };
    this.showForm = true;
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.isUploading = true;
      this.api.uploadOfferBanner(file).subscribe({
        next: (res) => {
          this.formData.banner_image_url = res.url;
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

  cancelForm(): void {
    this.showForm = false;
    this.formData = this.emptyForm();
  }

  saveOffer(): void {
    // ── Client-side validation ─────────────────────────────────────────────
    const f = this.formData;
    if (!f.name?.trim()) { this.formError = 'Offer name is required.'; return; }
    if (!f.discount_type)  { this.formError = 'Discount type is required.'; return; }
    if (!f.discount_value || f.discount_value <= 0) { this.formError = 'Discount value must be greater than 0.'; return; }
    if (!f.start_date) { this.formError = 'Start date is required.'; return; }
    if (!f.end_date)   { this.formError = 'End date is required.'; return; }
    if (f.start_date > f.end_date) { this.formError = 'Start date must be before end date.'; return; }
    this.formError = '';

    this.isSaving = true;
    const action = this.isEditing
      ? this.api.updateOffer(this.formData.id, this.formData)
      : this.api.createOffer(this.formData);

    action.subscribe({
      next: () => {
        this.isSaving = false;
        this.showForm = false;
        this.loadOffers();
      },
      error: (err) => {
        this.isSaving = false;
        if (err.status === 400 || err.status === 401) {
          this.formError = 'Session expired — please log out and log back in.';
        } else {
          this.formError = err.error?.error || 'Save failed. Please check all fields and try again.';
        }
      }
    });
  }

  toggleActive(offer: any): void {
    this.api.toggleOffer(offer.id).subscribe({
      next: () => { offer.is_active = !offer.is_active; }
    });
  }

  deleteOffer(offer: any): void {
    if (!confirm(`Delete "${offer.name}"? This cannot be undone.`)) return;
    this.api.deleteOffer(offer.id).subscribe({
      next: () => { this.offers = this.offers.filter(o => o.id !== offer.id); }
    });
  }
}
