import { provideZonelessChangeDetection } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { QueryClient, provideTanStackQuery } from '@tanstack/angular-query-experimental';
import { vi } from 'vitest';
import { client } from '../api/client.gen';
import { AuthService } from './auth.service';
import { UserMenuComponent } from './user-menu.component';

describe('UserMenuComponent', () => {
  const auth = { login: vi.fn(), register: vi.fn(), logout: vi.fn() };

  /** Serve `GET /api/auth/me` with the given status and body. */
  function stubMe(status: number, body: unknown = {}): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req: Request) => {
        expect(new URL(req.url).pathname).toBe('/api/auth/me');
        return new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );
  }

  async function render(): Promise<ComponentFixture<UserMenuComponent>> {
    const fixture = TestBed.createComponent(UserMenuComponent);
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('button')).toBeTruthy();
    });
    return fixture;
  }

  const button = (fixture: ComponentFixture<unknown>, label: string): HTMLButtonElement =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label,
    )!;

  beforeEach(() => {
    vi.clearAllMocks();
    // Node's Request can't resolve the app's relative `/api` base under jsdom.
    client.setConfig({ baseUrl: 'http://localhost/api' });
    TestBed.configureTestingModule({
      imports: [UserMenuComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideTanStackQuery(new QueryClient()),
        provideTranslateService({ fallbackLang: 'en' }),
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  afterEach(() => {
    client.setConfig({ baseUrl: '/api' });
    vi.unstubAllGlobals();
  });

  it('shows the signed-in email and logs out on click', async () => {
    stubMe(200, { id: 'u1', email: 'dev@example.com', name: 'Dev' });
    const fixture = await render();

    expect(fixture.nativeElement.textContent).toContain('dev@example.com');
    expect(button(fixture, 'auth.signIn')).toBeUndefined();

    button(fixture, 'auth.logout').click();
    expect(auth.logout).toHaveBeenCalledOnce();
  });

  it('offers sign in / create account when /auth/me is a 401', async () => {
    stubMe(401, { statusCode: 401, message: 'Unauthorized' });
    const fixture = await render();

    expect(fixture.nativeElement.textContent).not.toContain('@');
    expect(button(fixture, 'auth.logout')).toBeUndefined();

    button(fixture, 'auth.signIn').click();
    expect(auth.login).toHaveBeenCalledOnce();
    button(fixture, 'auth.register').click();
    expect(auth.register).toHaveBeenCalledOnce();
  });
});
