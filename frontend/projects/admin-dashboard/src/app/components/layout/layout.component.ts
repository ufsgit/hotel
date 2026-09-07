import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html'
})
export class LayoutComponent {
  isSidebarCollapsed = false;

  constructor(private router: Router) {}
  
  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout() {
    // Basic logout logic for scaffold
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
