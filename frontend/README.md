# frontend — Web Music Player SPA

Angular 22, **zoneless**, standalone components. Server state via **TanStack
Query** over a **generated HeyApi** fetch client (ADR-0006). Unit tests run on
Vitest (Angular 22 default); E2E on Playwright.

## Layout

```
src/app/
  api/            generated — do NOT edit (pnpm generate:api). See api/README.md
  api-runtime-config.ts   HeyApi client defaults (baseUrl /api, credentials include)
  core/           app-wide singletons (interceptors, guards)     — empty
  shared/         reusable dumb components, pipes                 — empty
  features/
    songs/  playlists/  player/  auth/                           — empty
  app.config.ts   providers: router, TanStack Query
e2e/              Playwright specs (run against the Compose stack)
```

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm start` | `ng serve` — proxies `/api` → `http://localhost:3000` (`proxy.conf.json`) |
| `pnpm build` | production build → `dist/` |
| `pnpm test` | unit tests (Vitest via `ng test`) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm generate:api` | regenerate `src/app/api/` from `../backend/openapi.json` (commit it) |
| `pnpm e2e` | Playwright against `https://localhost:8443` (bring up Compose first) |

## API client workflow

`../backend/openapi.json` (committed, generated from the backend zod schemas) is
the single source of truth. After it changes: `pnpm generate:api`, commit the
`src/app/api/` diff. CI regenerates and `git diff --exit-code`s it.

Example once a feature exists:

```ts
import { injectQuery } from '@tanstack/angular-query-experimental';
import { listSongsOptions } from './api/@tanstack/angular-query-experimental.gen';

readonly songs = injectQuery(() => listSongsOptions());
```
