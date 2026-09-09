import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminApiService {
  private baseUrl = 'http://localhost:3000/api/admin';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getBookings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/bookings`, { headers: this.getHeaders() });
  }

  updateBookingStatus(id: number, statusData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/bookings/${id}/status`, statusData, { headers: this.getHeaders() });
  }

  getOffers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/offers`, { headers: this.getHeaders() });
  }

  createOffer(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/offers`, data, { headers: this.getHeaders() });
  }

  updateOffer(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/offers/${id}`, data, { headers: this.getHeaders() });
  }

  toggleOffer(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/offers/${id}/toggle`, {}, { headers: this.getHeaders() });
  }

  deleteOffer(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/offers/${id}`, { headers: this.getHeaders() });
  }

  getRoomTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/room-types`, { headers: this.getHeaders() });
  }

  createRoomType(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/room-types`, data, { headers: this.getHeaders() });
  }

  updateRoomType(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/room-types/${id}`, data, { headers: this.getHeaders() });
  }

  deleteRoomType(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/room-types/${id}`, { headers: this.getHeaders() });
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/reports/stats`, { headers: this.getHeaders() });
  }

  getCalendar(start?: string, end?: string): Observable<any[]> {
    let url = `${this.baseUrl}/reports/calendar`;
    if (start && end) url += `?start=${start}&end=${end}`;
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  getHotelSettings(): Observable<any> {
    return this.http.get(`${this.baseUrl}/hotel-settings`, { headers: this.getHeaders() });
  }

  updateHotelSettings(data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/hotel-settings`, data, { headers: this.getHeaders() });
  }

  uploadLogo(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    // Don't include Content-Type header — browser sets it with boundary automatically
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post<{ url: string }>(`${this.baseUrl}/upload-logo`, formData, { headers });
  }

  uploadRoomPhoto(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('photo', file);
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post<{ url: string }>(`${this.baseUrl}/upload-room-photo`, formData, { headers });
  }
}
