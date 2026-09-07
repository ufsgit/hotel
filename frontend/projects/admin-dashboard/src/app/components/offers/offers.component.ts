import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './offers.component.html'
})
export class OffersComponent implements OnInit {
  offers = [
    { id: 1, name: 'Summer Special', discount_value: 20, discount_type: 'percent', is_active: true, priority: 10, banner_image_url: 'https://via.placeholder.com/800x200' },
    { id: 2, name: 'Weekend Getaway', discount_value: 50, discount_type: 'flat', is_active: false, priority: 5, banner_image_url: 'https://via.placeholder.com/800x200' }
  ];

  constructor() {}

  ngOnInit(): void {}

  toggleActive(offer: any): void {
    offer.is_active = !offer.is_active;
    // Real app would call AdminApiService here
  }
}
