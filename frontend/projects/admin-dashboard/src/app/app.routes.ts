import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ReservationsComponent } from './components/reservations/reservations.component';
import { OffersComponent } from './components/offers/offers.component';
import { RoomsComponent } from './components/rooms/rooms.component';
import { CalendarComponent } from './components/calendar/calendar.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: '', 
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'calendar', component: CalendarComponent },
      { path: 'reservations', component: ReservationsComponent },
      { path: 'offers', component: OffersComponent },
      { path: 'rooms', component: RoomsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];
