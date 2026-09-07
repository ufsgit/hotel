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

  getActiveOffers(slug: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/hotels/${slug}/active-offers`);
  }

  getAvailability(slug: string, checkIn: string, checkOut: string, guests: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/hotels/${slug}/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`);
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
}
