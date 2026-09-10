import { client } from '../api/client.gen';

/**
 * Any `401` from the API means the session is gone (or was never there). Send
 * the browser to the BFF login, which redirects on to Keycloak (ADR-0005).
 * With `AUTH_ENABLED=false` the API never returns `401`, so this stays dormant.
 */
export function installAuthRedirect(): void {
  let redirecting = false;
  client.interceptors.response.use((response) => {
    if (response.status === 401 && !redirecting) {
      redirecting = true;
      window.location.assign('/api/auth/login');
    }
    return response;
  });
}
