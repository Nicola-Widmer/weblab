import { vi } from 'vitest';
import { client } from '../api/client.gen';
import { installAuthRedirect } from './auth-redirect';

describe('installAuthRedirect', () => {
  let assign: ReturnType<typeof vi.fn>;

  const respondWith = (status: number) =>
    client.get({
      // Node's Request can't resolve the app's relative `/api` base under jsdom.
      baseUrl: 'http://localhost/api',
      url: '/songs',
      fetch: async () => new Response(status === 204 ? null : '{}', { status }),
    });

  beforeEach(() => {
    assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    installAuthRedirect();
  });

  afterEach(() => {
    client.interceptors.response.clear();
    vi.unstubAllGlobals();
  });

  it('sends the browser to the BFF login on a 401', async () => {
    await respondWith(401);
    expect(assign).toHaveBeenCalledExactlyOnceWith('/api/auth/login');
  });

  it('redirects only once when several requests 401 together', async () => {
    await Promise.all([respondWith(401), respondWith(401), respondWith(401)]);
    expect(assign).toHaveBeenCalledOnce();
  });

  it.each([200, 403, 404, 500])('leaves a %i response alone', async (status) => {
    await respondWith(status);
    expect(assign).not.toHaveBeenCalled();
  });
});
