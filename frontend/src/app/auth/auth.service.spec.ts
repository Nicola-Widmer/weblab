import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let assign: ReturnType<typeof vi.fn>;
  let auth: AuthService;

  beforeEach(() => {
    assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('login and register navigate to the BFF login endpoint', () => {
    auth.login();
    expect(assign).toHaveBeenLastCalledWith('/api/auth/login');
    auth.register();
    expect(assign).toHaveBeenLastCalledWith('/api/auth/login?register=1');
  });

  it('logout POSTs to /api/auth/logout with the cookie, then reloads at /', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);

    await auth.logout();

    expect(fetch).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    expect(assign).toHaveBeenCalledWith('/');
    // Navigate only after the session is gone server-side.
    expect(fetch.mock.invocationCallOrder[0]).toBeLessThan(assign.mock.invocationCallOrder[0]);
  });

  it('logout still leaves the page when the logout request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));

    await expect(auth.logout()).resolves.toBeUndefined();
    expect(assign).toHaveBeenCalledWith('/');
  });
});
