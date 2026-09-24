import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'guest-widget';
  hotel: any = null;
  hotelError = false;
  isLoading = true;
  hotelSlug = '';
  platformDefaultColor = '#6366f1'; // updated from platform settings on init

  constructor(
    private api: ApiService, 
    private route: ActivatedRoute, 
    private router: Router,
    private location: Location
  ) {}

  goBack(): void {
    this.location.back();
  }

  ngOnInit(): void {
    // Load platform default color first so fallback is correct
    this.api.getPlatformBranding().subscribe({
      next: (branding) => {
        this.platformDefaultColor = branding.default_primary_color || '#6366f1';
        // Apply platform default immediately; hotel color will override if set
        document.documentElement.style.setProperty('--hotel-primary', this.platformDefaultColor);
      },
      error: () => { /* keep the hardcoded default */ }
    });

    // Try from URL search params first (initial page load)
    const params = new URLSearchParams(window.location.search);
    this.hotelSlug = params.get('hotel') || '';

    // Also watch for Angular route changes
    this.route.queryParams.subscribe(qp => {
      const newSlug = qp['hotel'] || '';
      if (newSlug && newSlug !== this.hotelSlug) {
        this.hotelSlug = newSlug;
        this.loadHotel(newSlug);
      } else if (newSlug && !this.hotel) {
        this.loadHotel(newSlug);
      }
    });

    if (this.hotelSlug) {
      this.loadHotel(this.hotelSlug);
    } else {
      this.hotelError = true;
      this.isLoading = false;
    }
  }

  private loadHotel(slug: string): void {
    this.isLoading = true;
    this.api.getHotelInfo(slug).subscribe({
      next: (data) => {
        this.hotel = data;
        this.isLoading = false;
        this.hotelError = false;
        // Use hotel's own color, fallback to platform default (not hardcoded)
        const color = data.branding_primary_color || this.platformDefaultColor;
        document.documentElement.style.setProperty('--hotel-primary', color);
      },
      error: (err) => {
        console.error('Failed to load hotel info', err);
        this.hotelError = true;
        this.isLoading = false;
      }
    });
  }
}
