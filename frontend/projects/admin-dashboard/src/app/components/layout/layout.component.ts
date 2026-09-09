import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminApiService } from '../../services/admin-api.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html'
})
export class LayoutComponent implements OnInit {
  isSidebarCollapsed = false;
  hotel: any = null;

  constructor(private authService: AuthService, private api: AdminApiService) {}

  ngOnInit(): void {
    this.api.getHotelSettings().subscribe({
      next: (data) => { this.hotel = data; },
      error: (err) => console.error('Failed to load hotel settings', err)
    });
  }
  
  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout() {
    this.authService.logout();
  }
}

