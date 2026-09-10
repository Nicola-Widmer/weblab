import type { IssuedTokens } from '../domain/session';

/**
 * Port: the backend's own conversations with Keycloak as a confidential client
 * (ADR-0005) — everything except validating an access token, which is the
 * `TokenVerifier`'s job.
 *
 * `authorizeUrl` is browser-facing (built from the public issuer); the other
 * three are back-channel calls the API makes itself (to the in-cluster URL).
 */
export abstract class OidcClient {
  /**
   * URL to redirect the browser to, to start the authorization-code flow.
   * `register: true` opens Keycloak's self-registration form instead of the
   * login form (the realm has `registrationAllowed`).
   */
  abstract authorizeUrl(params: { state: string; register?: boolean }): string;

  /** Exchange an authorization `code` for tokens. */
  abstract exchangeCode(code: string): Promise<IssuedTokens>;

  /** Trade a refresh token for a fresh set. */
  abstract refresh(refreshToken: string): Promise<IssuedTokens>;

  /** Back-channel logout: end the Keycloak session behind a refresh token. */
  abstract endSession(refreshToken: string): Promise<void>;
}
