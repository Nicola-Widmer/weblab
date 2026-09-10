import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { asUuid } from '../../shared/domain/uuid';
import {
  TokenVerifier,
  type VerifiedToken,
} from '../application/token-verifier';
import { authConfig, oidcEndpoints } from '../config';

/**
 * Validates access tokens against the realm JWKS with `jose` (v4 — the last
 * CommonJS release, like `music-metadata`). The key set is fetched lazily on
 * the first `verify` and cached with rotation handling, so constructing this
 * touches no network.
 */
@Injectable()
export class JoseTokenVerifier extends TokenVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;
  private readonly audience: string;

  constructor() {
    super();
    const cfg = authConfig();
    this.issuer = cfg.issuerUrl;
    this.audience = cfg.audience;
    this.jwks = createRemoteJWKSet(
      new URL(oidcEndpoints(cfg.internalUrl).jwks),
    );
  }

  async verify(accessToken: string): Promise<VerifiedToken> {
    const { payload } = await jwtVerify(accessToken, this.jwks, {
      issuer: this.issuer,
      audience: this.audience,
      clockTolerance: 5, // seconds
    });

    if (typeof payload.sub !== 'string') {
      throw new Error('access token has no `sub` claim');
    }
    return {
      subject: asUuid(payload.sub), // throws if `sub` is not a UUID
      email: nonEmpty(payload.email),
      name: nonEmpty(payload.name),
    };
  }
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
