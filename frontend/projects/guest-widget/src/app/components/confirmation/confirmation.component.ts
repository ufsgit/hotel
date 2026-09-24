import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './confirmation.component.html'
})
export class ConfirmationComponent implements OnInit {
  reference: string = '';
  guestName: string = '';
  hotelSlug: string = '';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.reference = params['ref'];
      this.guestName = params['name'];
      this.hotelSlug = params['hotel'] || '';
    });
  }

  goHome(): void {
    this.router.navigate(['/'], { queryParams: { hotel: this.hotelSlug } });
  }
}
