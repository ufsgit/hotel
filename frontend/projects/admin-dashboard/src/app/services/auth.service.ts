import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:3000/api/admin';

  constructor(private http: HttpClient, private router: Router) { }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap(res => {
        if (res.token) {
          if (res.user?.role === 'super_admin') {
            // Super admin uses sessionStorage — tab-isolated, never bleeds into hotel admin tabs
            sessionStorage.setItem('sa_token', res.token);
            if (res.user) sessionStorage.setItem('sa_user', JSON.stringify(res.user));
          } else {
            // Hotel admin uses localStorage — persists across page reloads
            localStorage.setItem('token', res.token);
            if (res.user) localStorage.setItem('user', JSON.stringify(res.user));
          }
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('active_hotel_id');
    sessionStorage.removeItem('sa_token');
    sessionStorage.removeItem('sa_user');
    // Also clear impersonation
    sessionStorage.removeItem('impersonate_token');
    sessionStorage.removeItem('impersonate_hotel_id');
    sessionStorage.removeItem('impersonate_user');
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    // Impersonation > super admin session > hotel admin session
    return sessionStorage.getItem('impersonate_token')
      || sessionStorage.getItem('sa_token')
      || localStorage.getItem('token');
  }

  getUser(): any {
    try {
      // Impersonation > super admin session > hotel admin session
      const userStr = sessionStorage.getItem('impersonate_user')
        || sessionStorage.getItem('sa_user')
        || localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch { return null; }
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    return !!token && token !== 'fake-jwt-token-for-scaffold' && token !== 'null' && token !== 'undefined';
  }
}
