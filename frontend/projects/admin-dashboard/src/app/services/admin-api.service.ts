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
    const hotelId = localStorage.getItem('active_hotel_id');
    let headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    if (hotelId) {
      headers = headers.append('X-Hotel-ID', hotelId);
    }
    return headers;
  }

  getMyHotels(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/my-hotels`, { headers: this.getHeaders() });
  }

  getBookings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/bookings`, { headers: this.getHeaders() });
  }

  updateBookingStatus(id: number, statusData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/bookings/${id}/status`, statusData, { headers: this.getHeaders() });
  }

  uploadGuestDocument(bookingId: number, file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('document', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/upload-guest-document/${bookingId}`, formData, { headers: this.getHeaders() });
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

  // --- PROMO CODES ---

  getPromoCodes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/promo-codes`, { headers: this.getHeaders() });
  }

  createPromoCode(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/promo-codes`, data, { headers: this.getHeaders() });
  }

  updatePromoCode(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/promo-codes/${id}`, data, { headers: this.getHeaders() });
  }

  togglePromoCode(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/promo-codes/${id}/toggle`, {}, { headers: this.getHeaders() });
  }

  deletePromoCode(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/promo-codes/${id}`, { headers: this.getHeaders() });
  }

  // --- ROOM TYPES ---

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

  getStats(range: string = '7d'): Observable<any> {
    return this.http.get(`${this.baseUrl}/reports/stats?range=${range}`, { headers: this.getHeaders() });
  }

  getStatDetails(metric: string, range: string = '7d'): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/reports/stat-details?metric=${metric}&range=${range}`, { headers: this.getHeaders() });
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

  // --- STAFF MANAGEMENT ---
  getStaff(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/staff`, { headers: this.getHeaders() });
  }

  addStaff(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/staff`, data, { headers: this.getHeaders() });
  }

  updateStaff(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/staff/${id}`, data, { headers: this.getHeaders() });
  }

  removeStaff(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/staff/${id}`, { headers: this.getHeaders() });
  }

  uploadLogo(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/upload-logo`, formData, { headers: this.getHeaders() });
  }

  uploadRoomPhoto(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/upload-room-photo`, formData, { headers: this.getHeaders() });
  }

  uploadOfferBanner(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('banner', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/upload-offer-banner`, formData, { headers: this.getHeaders() });
  }
}
