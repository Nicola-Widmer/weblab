/**
 * Auth configuration for the `identity` context (ADR-0005), read straight from
 * the environment like the rest of the backend — no `ConfigModule`. Call these
 * at wiring time, not import time, so tests can set the vars first.
 */

const DEFAULT_ISSUER = 'http://localhost:8081/realms/wmp';

export interface AuthConfig {
  /** `false` → the fixed local user owns everything; no token is checked. */
  enabled: boolean;
  /**
   * Public realm URL: the `iss` every access token must carry, and the host the
   * browser is sent to for login and logout.
   */
  issuerUrl: string;
  /**
   * Realm URL the backend calls itself — code exchange and JWKS. Differs from
   * `issuerUrl` behind Compose (in-cluster `http://keycloak:8080`); defaults to
   * `issuerUrl` for a natively-run backend where the two are the same.
   */
  internalUrl: string;
  /** Required `aud` on the access token (set by the Keycloak audience mapper). */
  audience: string;
  clientId: string;
  clientSecret: string;
  /** Absolute URL Keycloak redirects the browser back to after login. */
  redirectUri: string;
  /** Where the browser lands after a completed login / logout (SPA route). */
  postLoginRedirect: string;
  /** Name of the opaque BFF session cookie. */
  cookieName: string;
  /** `Secure` flag on the session cookie — off only for plain-HTTP native dev. */
  cookieSecure: boolean;
  /** Session lifetime in seconds (independent of access-token expiry). */
  sessionTtlSeconds: number;
}

export function authConfig(): AuthConfig {
  const issuerUrl = process.env.OIDC_ISSUER_URL ?? DEFAULT_ISSUER;
  const ttlHours = Number(process.env.SESSION_TTL_HOURS ?? 168);
  return {
    // Compose and `.env.example` default this to `true`; unset (tests,
    // `pnpm openapi`) falls back to `false` so no OIDC config is required.
    enabled: process.env.AUTH_ENABLED === 'true',
    issuerUrl,
    internalUrl: process.env.OIDC_INTERNAL_URL ?? issuerUrl,
    audience: process.env.OIDC_AUDIENCE ?? 'wmp-api',
    clientId: process.env.OIDC_CLIENT_ID ?? 'wmp-api',
    // No default: a shared fallback secret would let a misconfigured production
    // deployment still exchange codes against a matching realm. `assertAuthConfig`
    // rejects an empty value at wiring time when `enabled`.
    clientSecret: process.env.OIDC_CLIENT_SECRET ?? '',
    redirectUri:
      process.env.OIDC_REDIRECT_URI ??
      'https://localhost:8443/api/auth/callback',
    postLoginRedirect: process.env.OIDC_POST_LOGIN_REDIRECT ?? '/',
    cookieName: process.env.SESSION_COOKIE_NAME ?? 'wmp.sid',
    cookieSecure: process.env.SESSION_COOKIE_SECURE !== 'false',
    sessionTtlSeconds: Math.round(
      (Number.isFinite(ttlHours) ? ttlHours : 168) * 3600,
    ),
  };
}

/**
 * Env vars with no safe production default. When `AUTH_ENABLED=true` the backend
 * is a confidential OIDC client and cannot function without them.
 */
const REQUIRED_WHEN_ENABLED = [
  'OIDC_ISSUER_URL',
  'OIDC_CLIENT_ID',
  'OIDC_CLIENT_SECRET',
  'OIDC_REDIRECT_URI',
] as const;

/**
 * Fail fast at wiring time. Without this a deployment with `AUTH_ENABLED=true`
 * but a forgotten `OIDC_CLIENT_SECRET` would boot cleanly and every token
 * exchange would still appear to work against a realm using the old shared
 * default. Wired as an eager provider in `IdentityModule`.
 */
export function assertAuthConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (env.AUTH_ENABLED !== 'true') return;
  const missing = REQUIRED_WHEN_ENABLED.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `AUTH_ENABLED=true but these OIDC settings are unset: ${missing.join(', ')}`,
    );
  }
}

/** The OpenID Connect endpoints under a realm base URL. */
export interface OidcEndpoints {
  jwks: string;
  token: string;
  authorize: string;
  /** Same params as `authorize` but opens Keycloak's self-registration form. */
  register: string;
  endSession: string;
}

export function oidcEndpoints(realmBaseUrl: string): OidcEndpoints {
  const base = realmBaseUrl.replace(/\/+$/, '');
  return {
    jwks: `${base}/protocol/openid-connect/certs`,
    token: `${base}/protocol/openid-connect/token`,
    authorize: `${base}/protocol/openid-connect/auth`,
    register: `${base}/protocol/openid-connect/registrations`,
    endSession: `${base}/protocol/openid-connect/logout`,
  };
}
