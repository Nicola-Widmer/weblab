import 'reflect-metadata';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { exportJWK, generateKeyPair, type KeyLike, SignJWT } from 'jose';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import { JoseTokenVerifier } from '../src/identity/infrastructure/jose-token-verifier';

const ISSUER = 'https://issuer.test/realms/wmp';
const AUDIENCE = 'wmp-api';
const SUB = '3f8c1a2b-0000-4000-8000-0000000abcde';

let signingKey: KeyLike; // in the JWKS
let strayKey: KeyLike; // not in the JWKS
let server: Server; // stands in for the realm JWKS endpoint
let internalUrl: string;

/** Mint an access token — valid unless an override makes it otherwise. */
async function mint(
  o: {
    sub?: string | null;
    iss?: string;
    aud?: string;
    expiresAt?: string | number;
    key?: KeyLike;
    extra?: Record<string, unknown>;
  } = {},
): Promise<string> {
  const jwt = new SignJWT({ ...o.extra })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(o.iss ?? ISSUER)
    .setAudience(o.aud ?? AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(o.expiresAt ?? '5m');
  if (o.sub !== null) jwt.setSubject(o.sub ?? SUB);
  return jwt.sign(o.key ?? signingKey);
}

/** A fresh verifier pointed at the stub JWKS. Reads env in its constructor. */
function verifier(): JoseTokenVerifier {
  process.env.OIDC_ISSUER_URL = ISSUER;
  process.env.OIDC_INTERNAL_URL = internalUrl;
  process.env.OIDC_AUDIENCE = AUDIENCE;
  return new JoseTokenVerifier();
}

beforeAll(async () => {
  const kp = await generateKeyPair('RS256', { extractable: true });
  const stray = await generateKeyPair('RS256', { extractable: true });
  signingKey = kp.privateKey;
  strayKey = stray.privateKey;

  const jwk = await exportJWK(kp.publicKey);
  const body = JSON.stringify({
    keys: [{ ...jwk, kid: 'test-key', alg: 'RS256', use: 'sig' }],
  });
  server = createServer((_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(body);
  });
  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', resolve),
  );
  internalUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

afterEach(() => {
  delete process.env.OIDC_ISSUER_URL;
  delete process.env.OIDC_INTERNAL_URL;
  delete process.env.OIDC_AUDIENCE;
});

describe('JoseTokenVerifier', () => {
  it('accepts a valid token and returns subject, email and name', async () => {
    const token = await mint({
      extra: { email: 'dev@example.com', name: 'Dev User' },
    });
    await expect(verifier().verify(token)).resolves.toEqual({
      subject: SUB,
      email: 'dev@example.com',
      name: 'Dev User',
    });
  });

  it('leaves email and name undefined when the token omits them', async () => {
    await expect(verifier().verify(await mint())).resolves.toEqual({
      subject: SUB,
    });
  });

  it('rejects an expired token', async () => {
    const token = await mint({ expiresAt: Math.floor(Date.now() / 1000) - 60 });
    await expect(verifier().verify(token)).rejects.toThrow();
  });

  it('rejects a token from a different issuer', async () => {
    const token = await mint({ iss: 'https://evil.test/realms/wmp' });
    await expect(verifier().verify(token)).rejects.toThrow();
  });

  it('rejects a token minted for a different audience', async () => {
    const token = await mint({ aud: 'some-other-client' });
    await expect(verifier().verify(token)).rejects.toThrow();
  });

  it('rejects a token signed by a key absent from the JWKS', async () => {
    const token = await mint({ key: strayKey });
    await expect(verifier().verify(token)).rejects.toThrow();
  });

  it('rejects a token with no subject', async () => {
    const token = await mint({ sub: null });
    await expect(verifier().verify(token)).rejects.toThrow();
  });

  it('rejects a token whose subject is not a UUID', async () => {
    const token = await mint({ sub: 'not-a-uuid' });
    await expect(verifier().verify(token)).rejects.toThrow();
  });
});
