#import "../lib.typ": adrlink, mermaid, tbl

#pagebreak(weak: true)

= Building Block View

== Level 1 — System

#mermaid(```mermaid
flowchart TB
  subgraph FE["frontend/ (Angular SPA)"]
    R["Routes: songs, playlists"]
    PS["PlayerService"]
  end
  subgraph BE["backend/ (NestJS API)"]
    ID["identity"]
    SO["songs"]
    PL["playlists"]
  end
  FE -->|"REST /api (generated client)"| BE
  SO -.->|"SongDeleted"| PL
  BE --> DB[("PostgreSQL: app db")]
  SO --> FS[("FileStorage")]
  ID --> KC["Keycloak"]
  KC --> KDB[("PostgreSQL: keycloak-db")]
```)

#tbl(
  [Block], [Responsibility],
  [`frontend/`], [UI and client-side playback state. No business rules.],
  [`backend/`], [All rules and owner checks. Detail: `domain-model.typ`.],
  [nginx], [Serves the SPA, proxies `/api`, terminates TLS.],
  [PostgreSQL `db`], [App data: songs, playlists, users, sessions.],
  [FileStorage], [Audio and cover bytes. Local filesystem.],
  [Keycloak], [Login and registration (OIDC).],
  [PostgreSQL `keycloak-db`], [Keycloak's own data. The API never touches it.],
)

== Level 2 — Backend Module

Every context has the same four layers. Dependencies point inward.

#mermaid(```mermaid
flowchart LR
  H["http/ (controllers, DTOs)"] --> A["application/ (use cases, ports)"]
  I["infrastructure/ (Drizzle, filesystem)"] -->|"implements ports"| A
  A --> D["domain/ (aggregates, value objects)"]
```)

== Level 2 — Frontend

#mermaid(```mermaid
flowchart TB
  subgraph routes["Route components"]
    SP["SongsPage"]
    PP["PlaylistsPage"]
    PD["PlaylistDetail"]
  end
  SLP["SongListPanel (smart)"]
  SL["SongList"]
  ROW["SongRow"]
  MENU["SongMenu"]
  PLS["PlayerService (signals + audio)"]
  BAR["Player bar"]
  DRW["Player drawer"]
  SP --> SLP
  PD --> SLP
  SLP --> SL --> ROW --> MENU
  SLP -->|"play(song, queue)"| PLS
  BAR --> PLS
  DRW --> PLS
  PP --> GRID["PlaylistGrid"] --> CARD["PlaylistCard"]
```)

#tbl(
  [Folder], [Contents],
  [`api/`], [Generated client + query options. Don't edit.],
  [`auth/`], [Login redirects, 401 handling, user menu.],
  [`shared/songs/`], [Song list panel and its presentational parts.],
  [`features/songs/`], [Songs route, upload.],
  [`features/playlists/`], [Playlists routes, grid, cards, dialogs.],
  [`features/player/`], [`PlayerService`, bar, drawer, turntable UI.],
)

State has two homes (#adrlink("0006-openapi-typed-client-tanstack-query")):
- *Server state* lives in TanStack Query. Never copied into signals.
- *Client state* lives in a component signal, or in `PlayerService` when
  several components need it at the same time.
