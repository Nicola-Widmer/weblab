#import "../lib.typ": adrlink, tbl

#pagebreak(weak: true)

= Solution Strategy

#tbl(columns: (auto, 1fr, auto),
  [Goal], [Approach], [ADR],
  [Simplicity], [One repo, one backend process.], [#adrlink("0001-monorepo-monolith")],
  [Testability], [DDD + hexagonal NestJS modules: `identity`, `songs`,
   `playlists`. Contexts talk via async in-process events.],
  [#adrlink("0002-ddd-hexagonal-backend")],
  [Streaming, one origin], [nginx serves the SPA and proxies `/api`.],
  [#adrlink("0003-nginx-serves-frontend")],
  [Portability], [Metadata in PostgreSQL, audio behind a `FileStorage` port.],
  [#adrlink("0004-metadata-postgres-blob-storage-port")],
  [Privacy], [Keycloak login, session cookie, every query scoped by owner.],
  [#adrlink("0005-session-cookie-auth")],
  [One contract], [OpenAPI generated from the backend, typed client generated
   from that. TanStack Query for server state.],
  [#adrlink("0006-openapi-typed-client-tanstack-query")],
  [Maintainable UI], [Presentational/container split; playback in one service.],
  [#adrlink("0007-frontend-component-communication")],
  [Turntable feel], [CSS animation gated on `prefers-reduced-motion`.], [—],
)
