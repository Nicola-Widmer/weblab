import { Injectable } from '@nestjs/common';
import { OidcClient } from '../application/oidc-client';
import { authConfig, oidcEndpoints } from '../config';
import type { IssuedTokens } from '../domain/session';

/**
 * `OidcClient` over `fetch`. The authorize URL is built from the public issuer
 * (the browser follows it); token and logout calls go to the in-cluster URL.
 */
@Injectable()
export class HttpOidcClient extends OidcClient {
  authorizeUrl({
    state,
    register = false,
  }: {
    state: string;
    register?: boolean;
  }): string {
    const cfg = authConfig();
    const endpoints = oidcEndpoints(cfg.issuerUrl);
    const url = new URL(register ? endpoints.register : endpoints.authorize);
    url.search = new URLSearchParams({
      client_id: cfg.clientId,
      response_type: 'code',
      scope: 'openid email profile',
      redirect_uri: cfg.redirectUri,
      state,
    }).toString();
    return url.toString();
  }

  async exchangeCode(code: string): Promise<IssuedTokens> {
    const cfg = authConfig();
    return this.tokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirectUri,
    });
  }

  async refresh(refreshToken: string): Promise<IssuedTokens> {
    return this.tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  }

  async endSession(refreshToken: string): Promise<void> {
    const cfg = authConfig();
    const res = await fetch(oidcEndpoints(cfg.internalUrl).endSession, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        refresh_token: refreshToken,
      }),
    });
    // A already-invalid token still means "logged out"; only a 5xx is a problem.
    if (res.status >= 500) {
      throw new Error(`Keycloak end-session failed: ${res.status}`);
    }
  }

  private async tokenRequest(
    params: Record<string, string>,
  ): Promise<IssuedTokens> {
    const cfg = authConfig();
    const res = await fetch(oidcEndpoints(cfg.internalUrl).token, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        ...params,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Keycloak token request failed: ${res.status} ${detail}`);
    }
    const body = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!body.access_token || !body.refresh_token) {
      throw new Error('Keycloak token response missing access/refresh token');
    }
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresInSeconds: body.expires_in ?? 300,
    };
  }
}
