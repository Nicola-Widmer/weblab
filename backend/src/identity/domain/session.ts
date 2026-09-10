import { Uuid } from '../../shared/domain/uuid';

/** Fresh OIDC tokens from a code exchange or a refresh. */
export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime, seconds, as reported by Keycloak (`expires_in`). */
  expiresInSeconds: number;
}

/**
 * A server-side session (ADR-0005). `id` is the opaque value in the BFF cookie;
 * the Keycloak tokens live here and never reach the browser. The short-lived
 * access token is refreshed with the refresh token when it nears expiry;
 * `expiresAt` is the hard cap on the whole session.
 */
export class Session {
  constructor(
    readonly id: Uuid,
    readonly userId: Uuid,
    readonly createdAt: Date,
    readonly expiresAt: Date,
    readonly accessToken: string,
    readonly refreshToken: string,
    readonly accessTokenExpiresAt: Date,
  ) {}

  /** Created from a completed authorization-code exchange. */
  static fromTokens(
    id: Uuid,
    userId: Uuid,
    now: Date,
    ttlSeconds: number,
    tokens: IssuedTokens,
  ): Session {
    return new Session(
      id,
      userId,
      now,
      new Date(now.getTime() + ttlSeconds * 1000),
      tokens.accessToken,
      tokens.refreshToken,
      new Date(now.getTime() + tokens.expiresInSeconds * 1000),
    );
  }

  isValid(now: Date): boolean {
    return now < this.expiresAt;
  }

  /** True when the access token is expired or within 5s of it. */
  accessTokenExpired(now: Date): boolean {
    return now.getTime() >= this.accessTokenExpiresAt.getTime() - 5000;
  }

  /** A copy with the access/refresh tokens replaced after a refresh. */
  withRefreshedTokens(now: Date, tokens: IssuedTokens): Session {
    return new Session(
      this.id,
      this.userId,
      this.createdAt,
      this.expiresAt,
      tokens.accessToken,
      tokens.refreshToken,
      new Date(now.getTime() + tokens.expiresInSeconds * 1000),
    );
  }
}
