#import "../lib.typ": adrlink

#pagebreak(weak: true)

= Solution Strategy

#table(
  columns: (auto, auto, auto),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  align: (left + horizon, left + horizon, center + horizon),
  [Quality goal], [Architectural approach], [Ref],
  [Maintainability, testability],
  [*Monorepo monolith*: `backend/`, `frontend/`, Compose at the root — one
   deployable, one repo, simple mental model.], [#adrlink("0001-monorepo-monolith")],
  [Testability, maintainability],
  [*DDD + hexagonal* backend: one module per bounded context
   (`songs`, `playlists`, `identity`, `streaming`); the dependency rule points
   inward; cross-context communication via an in-process domain-event bus.],
  [#adrlink("0002-ddd-hexagonal-backend")],
  [Streaming performance, one public origin],
  [A *dedicated nginx container* serves the built SPA and reverse-proxies
   `/api` to Express — static files and `Range` streaming stay off the Node
   event loop; single origin keeps the session cookie first-party.],
  [#adrlink("0003-nginx-serves-frontend")],
  [Portability, future multi-node],
  [*PostgreSQL for metadata* + *pluggable binary storage* behind a
   `FileStorage` port (local filesystem default, S3-compatible optional).],
  [#adrlink("0004-metadata-postgres-blob-storage-port")],
  [Per-user privacy],
  [*Server-side session-cookie auth*; bcrypt password hashes; ownership
   enforced inside use cases (every repository query scoped by `ownerId`),
   with an `AUTH_ENABLED=false` mode backed by one implicit local user.],
  [#adrlink("0005-session-cookie-auth")],
  [One-command operation],
  [Everything is a Compose service; 12-factor env config; migrations run on API
   start; the S3 backend is a Compose *profile*, off by default.], [—],
  [Turntable UX],
  [Frontend feature slice `player/` with a single signal-based store as the
   source of playback truth; CSS animation gated on `prefers-reduced-motion`;
   `<audio>` element wrapped by an `AudioService`.], [—],
)
