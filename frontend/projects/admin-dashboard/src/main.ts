import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// ── Impersonation token bootstrap (must run BEFORE Angular starts) ──────────
// sessionStorage is used (not localStorage) because sessionStorage is TAB-ISOLATED.
// This prevents the impersonation token from overwriting the super admin's
// localStorage token in the original tab.
(function handleImpersonationToken() {
  const params = new URLSearchParams(window.location.search);
  const impersonateToken = params.get('impersonate_token');
  if (!impersonateToken) return;
  try {
    const payload = JSON.parse(atob(impersonateToken.split('.')[1]));
    // Store in sessionStorage — only visible in THIS tab
    sessionStorage.setItem('impersonate_token', impersonateToken);
    sessionStorage.setItem('impersonate_user', JSON.stringify({
      id: payload.id,
      hotel_id: payload.hotel_id,
      role: payload.role,
      impersonated: true
    }));
    if (payload.hotel_id) {
      sessionStorage.setItem('impersonate_hotel_id', String(payload.hotel_id));
    }
    // Clean the URL so Angular router doesn't see the token param
    window.history.replaceState({}, '', '/');
  } catch (e) {
    console.error('Failed to process impersonation token:', e);
  }
})();
// ─────────────────────────────────────────────────────────────────────────────

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

