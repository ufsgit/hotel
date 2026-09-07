import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './booking.component.html'
})
export class BookingComponent implements OnInit {
  hotelSlug = 'grand-oasis';
  bookingData: any = {
    roomTypeId: null,
    roomName: '',
    price: 0,
    checkIn: '',
    checkOut: '',
    guests: 2,
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    promo_code: '',
    paymentOption: 'pay_full'
  };
  pricing: any = null;
  isSubmitting = false;
  isCalculating = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.bookingData.roomTypeId = params['roomTypeId'];
      this.bookingData.roomName = params['roomName'];
      this.bookingData.checkIn = params['checkIn'];
      this.bookingData.checkOut = params['checkOut'];
      this.bookingData.guests = params['guests'];
      
      if (!this.bookingData.roomTypeId) {
        this.router.navigate(['/']);
      } else {
        this.calculatePrice();
      }
    });
  }

  calculatePrice(): void {
    this.isCalculating = true;
    const payload = {
      room_type_id: this.bookingData.roomTypeId,
      check_in_date: this.bookingData.checkIn,
      check_out_date: this.bookingData.checkOut,
      num_guests: this.bookingData.guests,
      promo_code: this.bookingData.promo_code
    };
    
    this.apiService.calculatePrice(this.hotelSlug, payload).subscribe({
      next: (res) => {
        this.pricing = res;
        this.bookingData.price = res.totalAmount;
        this.isCalculating = false;
      },
      error: () => {
        this.isCalculating = false;
      }
    });
  }

  applyPromo(): void {
    if (this.bookingData.promo_code) {
      this.calculatePrice();
    }
  }

  submitBooking(): void {
    if (!this.bookingData.guest_name || !this.bookingData.guest_email) {
      alert('Please fill out all required fields.');
      return;
    }

    this.isSubmitting = true;
    const payload = {
      room_type_id: this.bookingData.roomTypeId,
      guest_name: this.bookingData.guest_name,
      guest_email: this.bookingData.guest_email,
      guest_phone: this.bookingData.guest_phone,
      check_in_date: this.bookingData.checkIn,
      check_out_date: this.bookingData.checkOut,
      num_guests: this.bookingData.guests,
      promo_code: this.bookingData.promo_code
    };

    this.apiService.bookRoom(this.hotelSlug, payload).subscribe({
      next: (res) => {
        if (this.bookingData.paymentOption === 'pay_later') {
          this.isSubmitting = false;
          this.router.navigate(['/confirmation'], {
            queryParams: { ref: res.reference, name: this.bookingData.guest_name }
          });
        } else {
          this.initiatePayment(res.booking_id, res.reference);
        }
      },
      error: (err) => {
        console.error(err);
        this.isSubmitting = false;
        alert('Booking failed. Please try again.');
      }
    });
  }

  initiatePayment(bookingId: number, reference: string): void {
    const isPartial = this.bookingData.paymentOption === 'pay_partial';
    
    this.apiService.createPaymentOrder(this.hotelSlug, {
      booking_id: bookingId,
      amount: this.bookingData.price,
      is_partial: isPartial
    }).subscribe({
      next: (orderRes) => {
        this.openRazorpay(orderRes.order, bookingId, reference, isPartial);
      },
      error: (err) => {
        console.error('Failed to create order', err);
        this.isSubmitting = false;
        alert('Payment initialization failed.');
      }
    });
  }

  openRazorpay(order: any, bookingId: number, reference: string, isPartial: boolean): void {
    const options = {
      key: 'rzp_test_dummykey1234', // Should normally fetch from backend
      amount: order.amount,
      currency: order.currency,
      name: 'Grand Oasis Hotel',
      description: `Booking ${reference}`,
      order_id: order.id,
      handler: (response: any) => {
        // Payment success callback
        this.apiService.verifyPayment(this.hotelSlug, {
          booking_id: bookingId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
          is_partial: isPartial
        }).subscribe(() => {
          this.isSubmitting = false;
          this.router.navigate(['/confirmation'], {
            queryParams: { ref: reference, name: this.bookingData.guest_name, paid: true }
          });
        });
      },
      prefill: {
        name: this.bookingData.guest_name,
        email: this.bookingData.guest_email,
        contact: this.bookingData.guest_phone
      },
      theme: {
        color: '#2563eb' // tailwind blue-600
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', (response: any) => {
      console.error(response.error);
      this.isSubmitting = false;
      alert('Payment Failed: ' + response.error.description);
    });
    rzp.open();
  }
}
