import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { AdminApiService } from '../../services/admin-api.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './layout.component.html'
})
export class LayoutComponent implements OnInit {
  isSidebarCollapsed = false;
  hotel: any = null;
  userRole = '';
  userName = '';
  myHotels: any[] = [];
  activeHotelId: string | null = null;
  userPermissions: string[] = [];

  constructor(private authService: AuthService, private api: AdminApiService, private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.myHotels.length > 0 && this.userRole !== 'super_admin') {
        this.checkRoutePermission();
      }
    });
  }

  ngOnInit(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.userRole = user.role || '';
        this.userName = user.name || 'Admin';
      } catch (_) {}
    }

    // If super admin, they don't have an active property to select from.
    if (this.userRole !== 'super_admin') {
      this.activeHotelId = localStorage.getItem('active_hotel_id');
      
      this.api.getMyHotels().subscribe({
        next: (hotels) => {
          this.myHotels = hotels;
          if (hotels.length > 0) {
            // Auto-select first if none is selected
            if (!this.activeHotelId || !hotels.find(h => h.id.toString() === this.activeHotelId)) {
              this.userRole = hotels[0].role;
              this.userPermissions = hotels[0].permissions ? (typeof hotels[0].permissions === 'string' ? JSON.parse(hotels[0].permissions) : hotels[0].permissions) : [];
              this.switchHotel(hotels[0].id.toString(), false);
              this.checkRoutePermission();
            } else {
              // Fetch settings for the active one
              this.fetchActiveHotelSettings();
              // Update local userRole for this specific property
              const activeHotel = hotels.find(h => h.id.toString() === this.activeHotelId);
              if (activeHotel) {
                if (activeHotel.role) this.userRole = activeHotel.role;
                this.userPermissions = activeHotel.permissions ? (typeof activeHotel.permissions === 'string' ? JSON.parse(activeHotel.permissions) : activeHotel.permissions) : [];
                this.checkRoutePermission();
              }
            }
          }
        },
        error: (err) => console.error('Failed to load my hotels', err)
      });
    } else {
      // Super admin
      this.api.getHotelSettings().subscribe({
        next: (data) => { this.hotel = data; },
        error: (err) => console.error('Failed to load hotel settings', err)
      });
    }
  }

  fetchActiveHotelSettings() {
    this.api.getHotelSettings().subscribe({
      next: (data) => { this.hotel = data; },
      error: (err) => console.error('Failed to load hotel settings', err)
    });
  }

  switchHotel(hotelId: string, reload: boolean = true) {
    localStorage.setItem('active_hotel_id', hotelId);
    this.activeHotelId = hotelId;
    if (reload) {
      window.location.reload();
    } else {
      this.fetchActiveHotelSettings();
    }
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  hasPermission(page: string): boolean {
    if (this.userRole === 'super_admin' || this.userRole === 'owner') return true;
    return this.userPermissions.includes(page);
  }

  checkRoutePermission() {
    const currentUrl = this.router.url.split('?')[0];
    const path = currentUrl.split('/')[1] || ''; 

    const protectedPages = ['dashboard', 'calendar', 'reservations', 'rooms', 'offers', 'settings', 'staff'];
    
    if (path === 'no-access') {
       const firstAllowed = protectedPages.find(p => p !== 'staff' && this.hasPermission(p));
       if (firstAllowed) {
         this.router.navigate(['/' + firstAllowed]);
       }
       return;
    }

    if (this.userRole === 'super_admin' || this.userRole === 'owner') return;

    if (protectedPages.includes(path)) {
       if (!this.hasPermission(path)) {
          const firstAllowed = protectedPages.find(p => p !== 'staff' && this.hasPermission(p));
          if (firstAllowed) {
            this.router.navigate(['/' + firstAllowed]);
          } else {
            // No permissions, redirect to no-access
            this.router.navigate(['/no-access']);
          }
       }
    }
  }

  logout() {
    this.authService.logout();
  }
}


