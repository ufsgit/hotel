import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  getHotelInfo(slug: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/hotels/${slug}`);
  }

  getPlatformBranding(): Observable<{ default_primary_color: string }> {
    return this.http.get<{ default_primary_color: string }>(`${this.baseUrl}/platform/branding`);
  }

  getActiveOffers(slug: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/hotels/${slug}/offers`);
  }

  getAvailability(slug: string, checkIn: string, checkOut: string, guests: number, rooms: number = 1): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/hotels/${slug}/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&rooms=${rooms}`);
  }

  bookRoom(hotelSlug: string, bookingData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/hotels/${hotelSlug}/bookings`, bookingData);
  }

  calculatePrice(hotelSlug: string, bookingData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/hotels/${hotelSlug}/calculate-price`, bookingData);
  }

  createPaymentOrder(hotelSlug: string, paymentData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/hotels/${hotelSlug}/create-payment-order`, paymentData);
  }

  verifyPayment(hotelSlug: string, verificationData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/hotels/${hotelSlug}/verify-payment`, verificationData);
  }

  checkBookingStatus(hotelSlug: string, data: { booking_id: number, guest_email: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/hotels/${hotelSlug}/booking-status`, data);
  }

  cancelBooking(hotelSlug: string, data: { booking_id: number, guest_email: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/hotels/${hotelSlug}/cancel-booking`, data);
  }
}
