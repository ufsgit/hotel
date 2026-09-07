import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  isLoading = false;

  constructor(private router: Router) {}

  login() {
    this.isLoading = true;
    this.error = '';
    
    // Stub login for scaffold. Real app uses AuthService.
    setTimeout(() => {
      if (this.email === 'admin@grandoasis.com' && this.password === 'password123') {
        localStorage.setItem('token', 'fake-jwt-token-for-scaffold');
        this.router.navigate(['/dashboard']);
      } else {
        this.error = 'Invalid credentials';
        this.isLoading = false;
      }
    }, 1000);
  }
}
