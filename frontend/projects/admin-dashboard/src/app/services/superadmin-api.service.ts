import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SuperAdminApiService {
  private baseUrl = 'http://localhost:3000/api/superadmin';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    // Super admin token is in sessionStorage (tab-isolated)
    const token = sessionStorage.getItem('sa_token') || localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // ── Platform Stats & Analytics ──────────────────────────────────────────────
  getPlatformStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/stats`, { headers: this.getHeaders() });
  }
  getTopHotels(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/top-hotels`, { headers: this.getHeaders() });
  }
  getRecentBookings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/recent-bookings`, { headers: this.getHeaders() });
  }
  getHotelStats(hotelId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/hotels/${hotelId}/stats`, { headers: this.getHeaders() });
  }

  // ── Hotel Management ────────────────────────────────────────────────────────
  getHotels(page: number = 1, limit: number = 10): Observable<any> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<any>(`${this.baseUrl}/hotels`, { headers: this.getHeaders(), params });
  }
  createHotel(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/hotels`, data, { headers: this.getHeaders() });
  }
  updateHotel(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/hotels/${id}`, data, { headers: this.getHeaders() });
  }
  suspendHotel(id: number): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/hotels/${id}/suspend`, {}, { headers: this.getHeaders() });
  }
  deleteHotel(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/hotels/${id}`, { headers: this.getHeaders() });
  }

  // ── User / Staff Management ─────────────────────────────────────────────────
  getAllUsers(page: number = 1, limit: number = 10, search: string = '', hotelFilter: string = ''): Observable<any> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search) params = params.set('search', search);
    if (hotelFilter) params = params.set('hotel', hotelFilter);
    return this.http.get<any>(`${this.baseUrl}/users`, { headers: this.getHeaders(), params });
  }
  getHotelUsers(hotelId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/hotels/${hotelId}/users`, { headers: this.getHeaders() });
  }
  createHotelAdmin(data: { name: string; email: string; password: string; hotel_id: number; role?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/users`, data, { headers: this.getHeaders() });
  }
  deleteUser(userId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/users/${userId}`, { headers: this.getHeaders() });
  }
  resetUserPassword(userId: number, newPassword: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/users/${userId}/reset-password`, { new_password: newPassword }, { headers: this.getHeaders() });
  }
  impersonateUser(userId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/impersonate/${userId}`, {}, { headers: this.getHeaders() });
  }

  // ── Platform Settings ────────────────────────────────────────────────────────
  getPlatformSettings(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/settings`, { headers: this.getHeaders() });
  }
  updatePlatformSettings(data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/settings`, data, { headers: this.getHeaders() });
  }
}
