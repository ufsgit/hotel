import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    const payload = authService.getUser();
    
    // Redirect super admin from hotel admin pages
    if (payload?.role === 'super_admin' && !state.url.startsWith('/manage-hotels')) {
      router.navigate(['/manage-hotels']);
      return false;
    }

    // Redirect hotel admin from super admin pages
    if (payload?.role !== 'super_admin' && state.url.startsWith('/manage-hotels')) {
      router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }

  router.navigate(['/login']);
  return false;
};
