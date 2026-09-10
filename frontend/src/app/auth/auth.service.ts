import { Injectable } from '@angular/core';

/**
 * Thin wrapper over the BFF auth endpoints (ADR-0005). Login and logout are
 * full-page navigations to `/api/auth/*` — the backend runs the Keycloak
 * redirect dance and the browser only ever holds the opaque session cookie, so
 * there is no token handling here and these routes are not in the generated
 * client.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Go to Keycloak's login form. */
  login(): void {
    window.location.assign('/api/auth/login');
  }

  /** Go to Keycloak's self-registration form. */
  register(): void {
    window.location.assign('/api/auth/login?register=1');
  }

  /** End the session server-side, then reload as an anonymous visitor. */
  async logout(): Promise<void> {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => undefined);
    window.location.assign('/');
  }
}
