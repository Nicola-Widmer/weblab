import { describe, expect, it } from 'vitest';
import { assertAuthConfig } from '../src/identity/config';

const complete: NodeJS.ProcessEnv = {
  AUTH_ENABLED: 'true',
  OIDC_ISSUER_URL: 'https://kc.example/realms/wmp',
  OIDC_CLIENT_ID: 'wmp-api',
  OIDC_CLIENT_SECRET: 's3cret',
  OIDC_REDIRECT_URI: 'https://app.example/api/auth/callback',
};

describe('assertAuthConfig', () => {
  it('passes when every required OIDC var is set', () => {
    expect(() => assertAuthConfig({ ...complete })).not.toThrow();
  });

  it('is a no-op unless auth is enabled', () => {
    expect(() => assertAuthConfig({})).not.toThrow();
    expect(() => assertAuthConfig({ AUTH_ENABLED: 'false' })).not.toThrow();
  });

  it('throws listing every missing var when enabled', () => {
    expect(() => assertAuthConfig({ AUTH_ENABLED: 'true' })).toThrow(
      /OIDC_ISSUER_URL.*OIDC_CLIENT_ID.*OIDC_CLIENT_SECRET.*OIDC_REDIRECT_URI/,
    );
  });

  it('treats a blank value as missing', () => {
    expect(() =>
      assertAuthConfig({ ...complete, OIDC_CLIENT_SECRET: '   ' }),
    ).toThrow(/OIDC_CLIENT_SECRET/);
  });
});
