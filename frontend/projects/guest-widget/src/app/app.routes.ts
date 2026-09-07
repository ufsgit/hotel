import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { RoomListComponent } from './components/room-list/room-list.component';
import { BookingComponent } from './components/booking/booking.component';
import { ConfirmationComponent } from './components/confirmation/confirmation.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'rooms', component: RoomListComponent },
  { path: 'book', component: BookingComponent },
  { path: 'confirmation', component: ConfirmationComponent },
  { path: '**', redirectTo: '' }
];
