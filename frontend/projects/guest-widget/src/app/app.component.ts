import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
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
  hotel: { name?: string; branding_logo_url?: string } | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getHotelInfo('grand-oasis').subscribe({
      next: (data) => { this.hotel = data; },
      error: (err) => console.error('Failed to load hotel info', err)
    });
  }
}

