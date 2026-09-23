#import "../lib.typ": adrlink, mermaid, tbl

#pagebreak(weak: true)

= Cross-cutting Concepts

== Ownership

Every repository read takes an `ownerId`. Another user's resource returns
`404` (#adrlink("0005-session-cookie-auth")).

== Authentication

The SPA never sees a token. It only sends an `HttpOnly` session cookie.

#mermaid(```mermaid
flowchart LR
  REQ["Request + cookie"] --> G{"Session valid?"}
  G -->|"no"| E401["401"] --> SPA["SPA redirects to /api/auth/login"]
  G -->|"yes"| T{"Access token expired?"}
  T -->|"yes"| RF["Refresh at Keycloak"] --> UC["Use case (ownerId = user)"]
  T -->|"no"| UC
```)

`AUTH_ENABLED=false` skips all of this and uses one fixed local user.

== Consistency between contexts

`SongDeleted` is the only cross-context event. It is fire-and-forget. An hourly
sweep removes playlist entries whose song no longer exists. Another hourly job
deletes expired sessions.

== Frontend

#tbl(
  [Topic], [Approach],
  [Events], [Leaves emit; at most two re-emits; one smart component owns the
   mutation (#adrlink("0007-frontend-component-communication")).],
  [Forms], [Angular Signal Forms. Server validates again.],
  [i18n], [`@ngx-translate`, all strings in `public/i18n/en.json`.],
  [Styling], [Tailwind 4 + Optimus UI. Dark mode follows the OS.],
  [Motion], [Turntable animation off under `prefers-reduced-motion`.],
  [Accessibility], [WCAG 2 AA checked by `pnpm a11y` (pa11y-ci) on the live
   stack.],
)

== Dependency supply chain

pnpm only installs versions that were published at least *5 days* ago
(`minimumReleaseAge: 7200` minutes in the root, `backend/` and `frontend/`
`pnpm-workspace.yaml`). `pnpm install --frozen-lockfile` also rejects a
committed lockfile that contains a younger version.

#tbl(columns: (1fr, 1fr),
  [Pros], [Cons],
  [Most malicious npm releases (hijacked maintainer accounts, worm-style
   self-publishing) are found and unpublished within hours to a few days. A
   5-day delay means we never install them.],
  [Security fixes also arrive 5 days late. An urgent patch needs a manual
   exception (`minimumReleaseAgeExclude`) or a temporary override.],
  [No extra tool or service. The check runs inside pnpm, in local installs and
   in the Docker builds.],
  [Freshly released versions cannot be used right away. A new package added
   in its first days fails to resolve.],
  [Upgrades are calmer: broken releases are usually fixed or deprecated before
   we pick them up.],
  [It only protects against _new_ malicious versions. An old compromised
   version or a malicious package that stays unnoticed longer is not caught.],
)

== Testing

#mermaid(```mermaid
flowchart LR
  E2E["E2E — 8 tests"]
  A11Y["Accessibility — 3 pages"]
  INT["Backend integration — 37 tests"]
  UNIT["Unit — 35 backend + 2 frontend"]
  E2E --- A11Y --- INT --- UNIT
```)

#tbl(columns: (auto, auto, auto, 1fr),
  [Type], [Tool], [Count], [What it covers],
  [Backend unit], [Vitest], [35 tests, 6 files], [Auth config, session guard,
   token verifier, session sweep, file storage, ID3 reader. Fake ports.],
  [Backend integration], [Supertest + Testcontainers], [37 tests,
   5 files], [HTTP endpoints against a real Postgres: songs, playlists,
   identity, user provisioning, the `SongDeleted` flow.],
  [Frontend unit], [Vitest (`ng test`)], [2 tests, 1 file], [App shell
   renders.],
  [E2E], [Playwright], [8 tests, 5 files], [Login redirect, navigation,
   upload/edit/delete song, reject non-MP3, playlist lifecycle, playback,
   song menu (add to playlist twice, Move Up/Down, Play), deleting a song
   removes it from playlists. Full Compose stack + real Keycloak.],
  [Accessibility], [pa11y-ci], [3 pages], [WCAG 2 AA on songs, playlists,
   playlist detail.],
)

#tbl(columns: (auto, auto, auto, auto, auto),
  [Coverage (2026-09-23)], [Lines], [Statements], [Branches], [Functions],
  [Backend — unit + integration], [85.8 %], [85.8 %], [87.5 %], [84.1 %],
  [Backend — E2E], [85.7 %], [85.7 %], [68.9 %], [83.0 %],
  [Frontend — unit], [30.4 %], [29.5 %], [34.1 %], [14.8 %],
  [Frontend — E2E], [82.9 %], [78.2 %], [56.7 %], [71.2 %],
)

Scope: hand-written code in `backend/src/` and `frontend/src/app/`. Not
counted: the generated `api/` client, specs, templates. Files that no test
loads count as 0 %. The rows are not merged.

#mermaid(```mermaid
flowchart LR
  PW["Playwright (Chromium)"] -->|"V8 JS coverage"| MCR["monocart + source maps"] --> FR["frontend/coverage-e2e/"]
  PW -->|"HTTPS"| API["API container, NODE_V8_COVERAGE"] -->|"on stop"| C8["c8 + source maps"] --> BR["backend/coverage-e2e/"]
```)

#tbl(
  [Command], [Produces],
  [`pnpm test:coverage` in `backend/` or `frontend/`], [Unit (+ integration)
   coverage in `coverage/`.],
  [`pnpm e2e:coverage` at the repo root], [Rebuilds the stack with source maps
   and coverage recording, runs Playwright, writes both `coverage-e2e/`
   reports, then restores the normal stack.],
)

The coverage build turns off Angular's optimizer, otherwise inlined code can't
be mapped back to its source file. The Playwright fixture saves coverage before
every `goto`/`reload`, because a full page load discards the old counts. Backend numbers are high even for E2E: Node counts code that runs at startup
(module loading, DI wiring) as covered.
