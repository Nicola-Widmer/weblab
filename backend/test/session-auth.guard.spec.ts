import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OidcClient } from '../src/identity/application/oidc-client';
import { Session, type IssuedTokens } from '../src/identity/domain/session';
import { SessionAuthGuard } from '../src/identity/http/session-auth.guard';
import { FakeSessionRepository } from './fakes';
import { LOCAL_USER_ID } from '../src/shared/domain/local-user';
import { asUuid, type Uuid } from '../src/shared/domain/uuid';

const SID = asUuid('aaaaaaaa-0000-4000-8000-000000000001');
const USER = asUuid('67bacbe7-c2d2-4922-b506-582df6956f66');
const NOW = new Date('2026-09-07T12:00:00.000Z');

const tokens = (over: Partial<IssuedTokens> = {}): IssuedTokens => ({
  accessToken: 'at',
  refreshToken: 'rt',
  expiresInSeconds: 300,
  ...over,
});

function ctx(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

let sessions: FakeSessionRepository;
let oidc: { refresh: ReturnType<typeof vi.fn>; [k: string]: unknown };
let isPublic = false;

function guard(): SessionAuthGuard {
  const reflector = { getAllAndOverride: () => isPublic } as never;
  const clock = { now: () => NOW };
  return new SessionAuthGuard(
    reflector,
    sessions,
    oidc as unknown as OidcClient,
    clock,
  );
}

beforeEach(() => {
  sessions = new FakeSessionRepository();
  oidc = { refresh: vi.fn(), exchangeCode: vi.fn(), endSession: vi.fn(), authorizeUrl: vi.fn() };
  isPublic = false;
  delete process.env.AUTH_ENABLED;
  process.env.SESSION_COOKIE_NAME = 'wmp.sid';
});

afterEach(() => {
  delete process.env.AUTH_ENABLED;
  delete process.env.SESSION_COOKIE_NAME;
});

describe('SessionAuthGuard', () => {
  it('lets a @Public() route through without a user', async () => {
    isPublic = true;
    const req: { user?: unknown } = {};
    await expect(guard().canActivate(ctx(req))).resolves.toBe(true);
    expect(req.user).toBeUndefined();
  });

  it('with AUTH_ENABLED unset, attaches the fixed local user', async () => {
    const req: { user?: { id: Uuid }; headers: object } = { headers: {} };
    await expect(guard().canActivate(ctx(req))).resolves.toBe(true);
    expect(req.user).toEqual({ id: LOCAL_USER_ID });
  });

  describe('with AUTH_ENABLED=true', () => {
    beforeEach(() => {
      process.env.AUTH_ENABLED = 'true';
    });

    it('rejects a request with no session cookie', async () => {
      await expect(
        guard().canActivate(ctx({ headers: {} })),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a cookie that maps to no session', async () => {
      await expect(
        guard().canActivate(ctx({ headers: { cookie: `wmp.sid=${SID}` } })),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('attaches the session user when the access token is still fresh', async () => {
      await sessions.save(
        Session.fromTokens(SID, USER, NOW, 3600, tokens()),
      );
      const req: { user?: { id: Uuid }; headers: object } = {
        headers: { cookie: `wmp.sid=${SID}` },
      };

      await expect(guard().canActivate(ctx(req))).resolves.toBe(true);
      expect(req.user).toEqual({ id: USER });
      expect(oidc.refresh).not.toHaveBeenCalled();
    });

    it('refreshes and persists when the access token has expired', async () => {
      const stale = new Date(NOW.getTime() - 10 * 60 * 1000);
      await sessions.save(Session.fromTokens(SID, USER, stale, 3600, tokens()));
      oidc.refresh.mockResolvedValue(tokens({ accessToken: 'at2', refreshToken: 'rt2' }));
      const req: { user?: { id: Uuid }; headers: object } = {
        headers: { cookie: `wmp.sid=${SID}` },
      };

      await expect(guard().canActivate(ctx(req))).resolves.toBe(true);
      expect(req.user).toEqual({ id: USER });
      expect(oidc.refresh).toHaveBeenCalledWith('rt');
      const saved = await sessions.byId(SID);
      expect(saved?.accessToken).toBe('at2');
    });

    it('deletes the session and rejects when the refresh fails', async () => {
      const stale = new Date(NOW.getTime() - 10 * 60 * 1000);
      await sessions.save(Session.fromTokens(SID, USER, stale, 3600, tokens()));
      oidc.refresh.mockRejectedValue(new Error('refresh rejected'));

      await expect(
        guard().canActivate(ctx({ headers: { cookie: `wmp.sid=${SID}` } })),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(await sessions.byId(SID)).toBeUndefined();
    });

    it('keeps the session when a concurrent request already refreshed it', async () => {
      const stale = new Date(NOW.getTime() - 10 * 60 * 1000);
      await sessions.save(Session.fromTokens(SID, USER, stale, 3600, tokens()));
      // The winning request rotates the tokens in the store, then ours fails
      // because the refresh token it presented is now spent.
      oidc.refresh.mockImplementation(async () => {
        await sessions.save(
          Session.fromTokens(SID, USER, NOW, 3600, tokens({ accessToken: 'at2' })),
        );
        throw new Error('invalid_grant: refresh token already used');
      });
      const req: { user?: { id: Uuid }; headers: object } = {
        headers: { cookie: `wmp.sid=${SID}` },
      };

      await expect(guard().canActivate(ctx(req))).resolves.toBe(true);
      expect(req.user).toEqual({ id: USER });
      const saved = await sessions.byId(SID);
      expect(saved?.accessToken).toBe('at2');
    });
  });
});
