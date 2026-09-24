import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'admin-dashboard';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // If this tab has an impersonation session (set in main.ts from ?impersonate_token),
    // navigate to the hotel dashboard directly.
    if (sessionStorage.getItem('impersonate_token')) {
      this.router.navigate(['/dashboard']);
    }
  }
}
