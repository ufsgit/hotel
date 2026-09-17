import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ReservationsComponent } from './components/reservations/reservations.component';
import { ActiveGuestsComponent } from './components/active-guests/active-guests.component';
import { OffersComponent } from './components/offers/offers.component';
import { RoomsComponent } from './components/rooms/rooms.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { SettingsComponent } from './components/settings/settings.component';
import { StaffComponent } from './components/staff/staff.component';
import { ReportsComponent } from './components/reports/reports.component';
import { SuperAdminDashboardComponent } from './components/super-admin/super-admin-dashboard.component';
import { NoAccessComponent } from './components/no-access/no-access.component';
import { authGuard } from './guards/auth.guard';
import { superAdminGuard } from './guards/superadmin.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: '', 
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'calendar', component: CalendarComponent },
      { path: 'reservations', component: ReservationsComponent },
      { path: 'active-guests', component: ActiveGuestsComponent },
      { path: 'offers', component: OffersComponent },
      { path: 'rooms', component: RoomsComponent },
      { path: 'staff', component: StaffComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'no-access', component: NoAccessComponent },
      { path: 'manage-hotels', component: SuperAdminDashboardComponent, canActivate: [superAdminGuard] },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];
