import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const superAdminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  // Super admin session is stored in sessionStorage (tab-isolated)
  const userStr = sessionStorage.getItem('sa_user') || localStorage.getItem('user');
  if (!userStr) {
    router.navigate(['/login']);
    return false;
  }
  try {
    const user = JSON.parse(userStr);
    if (user.role === 'super_admin') return true;
  } catch (_) {}
  router.navigate(['/dashboard']);
  return false;
};
