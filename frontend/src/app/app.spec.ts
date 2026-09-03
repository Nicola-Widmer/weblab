import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { QueryClient, provideTanStackQuery } from '@tanstack/angular-query-experimental';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes),
        provideTanStackQuery(new QueryClient()),
        provideTranslateService({ fallbackLang: 'en' }),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the songs page at the root route', async () => {
    const harness = await RouterTestingHarness.create('/');
    const page = harness.routeNativeElement;
    expect(page?.querySelector('app-song-upload')).toBeTruthy();
    expect(page?.querySelector('app-song-list')).toBeTruthy();
  });
});
