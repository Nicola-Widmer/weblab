#import "../lib.typ": adrlink

#pagebreak(weak: true)

= Cross-cutting Concepts

== State management (frontend)

Exactly two homes for state, as introduced in
#link("05-building-block-view.typ")[§5]: *server state* in TanStack Query
(#adrlink("0006-openapi-typed-client-tanstack-query")), *client state* either
local to a component or, when genuinely shared by several simultaneously
mounted parts of the shell, in an injectable signal-based service
(`PlayerService`). Nothing is duplicated between the two — a query result is
never copied into a signal "for convenience", and playback state is never
persisted through the API.

== Component communication (frontend)

Presentational leaves emit; layout components may re-emit an event unchanged
*once*; a single smart component per concern owns the query/mutation or calls
the shared service. Full rationale, alternatives considered, and the
two-hop rule of thumb:
#link("../../adr/0007-frontend-component-communication.pdf")[ADR-0007]. Traced
examples: #link("06-runtime-view.typ")[§6].

== Authentication (frontend half)

Login/logout are full-page navigations to `/api/auth/*`
(#adrlink("0005-session-cookie-auth")) — the SPA never touches a token, only
an opaque session cookie the browser sends automatically
(`credentials: include`, same origin, #adrlink("0003-nginx-serves-frontend")).
Two places react to being signed out: `auth-redirect.ts` installs a response
interceptor on the generated client that sends the whole page to the BFF
login on any `401`; `UserMenuComponent` queries `/auth/me` to decide between
showing the signed-in email or a Sign in / Create account pair. With
`AUTH_ENABLED=false` (native dev) both branches stay dormant — the API never
401s, and `/auth/me` always resolves to the one implicit local user.

== Internationalisation

`@ngx-translate/core` with one runtime-loaded locale (`public/i18n/en.json`);
every user-facing string is a translation key, including strings used for
Playwright/pa11y selectors — see §8.8 below.

== Forms

Angular Signal Forms (`@angular/forms/signals`) — `form()`, `required`,
`maxLength`, `submit()` — for the two mutating dialogs (song metadata,
playlist creation). Validation messages are translated; `submit()` marks the
form touched and no-ops on an invalid submit, so the mutation only ever fires
with data that already passed client-side validation (the API still
re-validates — this is UX, not the trust boundary).

== Styling & theming

Tailwind CSS 4 utility classes plus `@openng/optimus-ui` component styles, one
custom Aura theme preset (`app.config.ts`). Dark mode follows the OS
preference; the turntable's disc-spin and tone-arm animations are gated on
`prefers-reduced-motion` (the top-priority quality goal,
#link("01-introduction-and-goals.typ")[§1]).

== Accessibility

WCAG 2 AA is a CI-checkable gate, not a best-effort: `pnpm a11y`
(`pa11y-ci`, config `.pa11yci.cjs`) runs an axe + HTML_CodeSniffer scan against
the songs list, the playlists grid, and a playlist detail view on the live
Compose stack, authenticating through the real Keycloak form via pa11y's own
action scripting (browser cookies aren't reachable through pa11y's plain
`headers` option — see the comment at the top of `.pa11yci.cjs` for why).
`scripts/a11y-session.mjs` seeds one song and one playlist over the REST API
first so the scan sees populated list/detail markup, not empty states.
Semantics leaned on throughout: native `<button>`s for every interactive
control, `aria-label` on icon-only buttons (translated), and PrimeNG-derived
components (`p-dialog`, `p-tieredmenu`) that already carry the relevant ARIA
roles.

== Testing strategy (frontend)

#table(
  columns: (auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Layer], [Tool / scope],
  [Unit], [Vitest (`ng test`, Angular 22's default) — component and service
   logic in isolation.],
  [Accessibility], [pa11y-ci against the built app, see above.],
  [End-to-end], [Playwright (`pnpm e2e`), against the *full Compose stack*
   (`docker compose up -d`, `E2E_BASE_URL` defaults to
   `https://localhost:8443`) — real nginx, real NestJS API, real Postgres,
   real Keycloak. An `e2e/auth.setup.ts` project logs in once as the seeded
   `dev` user (`keycloak/import/wmp-realm.json`) through the actual hosted
   Keycloak form and saves the session as Playwright storage state, so the
   `chromium` project's specs start already signed in. Specs share that one
   backend and one user with no per-test data isolation, so they run
   `fullyParallel: false` / `workers: 1` and each spec cleans up what it
   creates (`deleteSong`, deleting the playlist it made) — see
   #link("11-risks-and-technical-debt.typ")[§11].],
)

Backend testing (unit / integration against a real Postgres via
Testcontainers) is out of scope for this section; see `backend/README.md`.
