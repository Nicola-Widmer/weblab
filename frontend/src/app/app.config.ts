import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  QueryClient,
  provideTanStackQuery,
} from '@tanstack/angular-query-experimental';
import { routes } from './app.routes';

/**
 * Zoneless (see `main.ts` / no zone.js). Server state is owned by TanStack
 * Query over the generated HeyApi fetch client (ADR-0006); the record-player
 * playback store will be a separate signal store in `features/player/`.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideTanStackQuery(
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
    ),
  ],
};
