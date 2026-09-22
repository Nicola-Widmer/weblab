#import "../lib.typ": adrlink

#pagebreak(weak: true)

= Building Block View

== Level 1 — Whitebox Overall System

#table(
  columns: (auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Building block], [Responsibility],
  [`frontend/` — Angular SPA],
  [Everything the browser runs: routes, the record-player UI, client-side
   playback state. No business rules — every mutation goes through the API.
   Detailed in Level 2 below.],
  [`backend/` — NestJS API],
  [DDD/hexagonal contexts `songs`, `playlists`, `identity`, `streaming`
   (#adrlink("0002-ddd-hexagonal-backend")); owns every invariant and every
   `ownerId` check. Its own building-block breakdown is `domain-model.typ`,
   not repeated here.],
  [nginx (Compose `web`)],
  [Serves the built SPA and reverse-proxies `/api/*` to the API
   (#adrlink("0003-nginx-serves-frontend")); TLS termination.],
  [PostgreSQL (Compose `db`)], [Song & playlist metadata; local user rows.],
  [Blob storage], [Audio bytes behind `FileStorage`
   (#adrlink("0004-metadata-postgres-blob-storage-port")): local filesystem by
   default, S3-compatible (MinIO in dev) behind a Compose profile.],
  [Keycloak + `keycloak-db`],
  [OIDC identity provider (#adrlink("0005-session-cookie-auth")); the backend
   is a confidential client and holds tokens server-side.],
)

The channel-level view (protocols, who calls whom) is in
#link("03-context-and-scope.typ")[§3, Technical Context] — not repeated here.

== Level 2 — Frontend Whitebox

`frontend/src/app/` is Angular 22, zoneless, standalone components, organised
by feature rather than by layer:

```
src/app/
  api/            generated HeyApi client + TanStack Query options (ADR-0006)
  api-runtime-config.ts   fetch client defaults (baseUrl /api, credentials include)
  auth/           AuthService (BFF redirects), auth-redirect (401 → login), UserMenuComponent
  core/           app-wide singletons (interceptors, guards) — currently empty
  shared/
    song-asset-urls.ts     cover/audio URL builders
    songs/                 SongListPanelComponent (smart) + presentational row/menu/skeleton
  features/
    songs/          SongsPageComponent (route), SongUploadComponent
    playlists/       PlaylistsPageComponent, PlaylistDetailComponent (routes),
                      ui/ (PlaylistGridComponent, PlaylistCardComponent, …)
    player/          PlayerService (signal store), PlayerComponent (bar),
                      PlayerDrawerComponent (expanded view), ui/ (transport,
                      scrubber, turntable, volume — all presentational)
  app.config.ts     providers: router, TanStack Query, i18n, Optimus UI theme
  app.routes.ts     /songs · /playlists · /playlists/:id
e2e/                Playwright specs, run against the full Compose stack
```

*State has exactly two homes*, never a third:

- *Server state* — anything that came from the API (songs, playlists) — lives
  in TanStack Query, injected via `injectQuery`/`injectMutation` in whichever
  component owns that data (#adrlink("0006-openapi-typed-client-tanstack-query")).
  Nothing duplicates it into a signal "just in case".
- *Client state* — state that exists only in the browser — is either local to
  one component (`signal()`/`model()` — e.g. which song is open in the edit
  dialog) or, when several unrelated parts of the shell need it at once,
  lives in an injectable service (`PlayerService`, `providedIn: 'root'`, one
  `<audio>` element mirrored into signals; see #link("08-crosscutting-concepts.typ")[§8]).

*Component roles* follow a presentational/container split with a capped
event-forwarding depth — the rule and its rationale are
#link("../../adr/0007-frontend-component-communication.pdf")[ADR-0007].
The building blocks it produces:

#table(
  columns: (auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Role], [Examples],
  [*Route component*],
  [`SongsPageComponent`, `PlaylistsPageComponent`, `PlaylistDetailComponent` —
   own a query, resolve route params, compose the panel/grid below them.],
  [*Smart panel*],
  [`SongListPanelComponent` — every song-row mutation (play, edit, delete,
   add/remove-from-playlist, reorder) for both the library and every
   playlist-detail view, so that logic exists exactly once.],
  [*Presentational — layout*],
  [`SongListComponent`, `PlaylistGridComponent` — lay out repeated children,
   re-emit their events unchanged, own no query or mutation.],
  [*Presentational — leaf*],
  [`SongRowComponent`, `SongMenuComponent`, `PlaylistCardComponent`,
   `player/ui/*` — take inputs, raise outputs, know nothing about HTTP.],
  [*Modal / form*],
  [`SongEditDialogComponent`, `PlaylistCreateDialogComponent` — Angular
   Signal Forms + their own mutation, opened by one input/output pair.],
)
