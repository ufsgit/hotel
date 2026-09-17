import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
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

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // In the root component, using URLSearchParams is often more reliable 
    // before the initial navigation completes than ActivatedRoute.
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('hotel');

    if (!slug) {
      this.hotelError = true;
      this.isLoading = false;
      return;
    }

    this.api.getHotelInfo(slug).subscribe({
      next: (data) => {
        this.hotel = data;
        this.isLoading = false;
        this.hotelError = false;
        if (data.branding_primary_color) {
          document.documentElement.style.setProperty('--hotel-primary', data.branding_primary_color);
        }
      },
      error: (err) => {
        console.error('Failed to load hotel info', err);
        // Fallback for debugging:
        this.hotelError = true;
        this.isLoading = false;
      }
    });
  }
}


