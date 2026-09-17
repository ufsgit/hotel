import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService } from '../../services/admin-api.service';

@Component({
  selector: 'app-guest-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guest-details-modal.component.html'
})
export class GuestDetailsModalComponent {
  @Input() guest: any = null;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  isUploadingDoc = false;
  uploadDocError = '';

  constructor(private api: AdminApiService) {}

  closeModal(): void {
    this.close.emit();
    this.isUploadingDoc = false;
    this.uploadDocError = '';
  }

  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 10 * 1024 * 1024) {
        this.uploadDocError = 'File is too large. Maximum size is 10 MB.';
        return;
      }
      this.isUploadingDoc = true;
      this.uploadDocError = '';
      this.api.uploadGuestDocument(this.guest.id, file).subscribe({
        next: (res) => {
          this.guest.guest_document_url = res.url;
          this.isUploadingDoc = false;
        },
        error: () => {
          this.isUploadingDoc = false;
          this.uploadDocError = 'Upload failed. Please try again.';
        }
      });
    }
  }
}
