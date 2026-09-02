#import "../lib.typ": adrlink

#pagebreak(weak: true)

= Architecture Decisions

This document (arc42) is the *living* architecture description. Individual
significant decisions are captured as standalone *ADRs* in
`Documentation/adr/`, MADR-style: numbered, immutable once accepted, superseded
rather than edited. Each ADR records context, the options considered, the
decision, and its consequences. New decisions get the next number and a link
back here.

#table(
  columns: (auto, 1fr, auto),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  align: (left + horizon, left + horizon, center + horizon),
  [ADR], [Decision], [Status],
  [#adrlink("0001-monorepo-monolith")],
  [Single repository, single deployable monolith (`backend/` + `frontend/` +
   root Compose).], [Accepted],
  [#adrlink("0002-ddd-hexagonal-backend")],
  [DDD tactical patterns with hexagonal layering; one feature-folder module per
   bounded context; asynchronous fire-and-forget in-process domain-event bus.],
  [Accepted],
  [#adrlink("0003-nginx-serves-frontend")],
  [A dedicated nginx container serves the SPA and reverse-proxies `/api`,
   rather than serving static files from Express.], [Accepted],
  [#adrlink("0004-metadata-postgres-blob-storage-port")],
  [PostgreSQL for metadata; audio bytes behind a `FileStorage` port with
   local-FS default and optional S3 adapter.], [Accepted],
  [#adrlink("0005-session-cookie-auth")],
  [Server-side session-cookie authentication; ownership enforced inside use
   cases; `AUTH_ENABLED=false` local-user mode.], [Accepted],
  [#adrlink("0006-openapi-typed-client-tanstack-query")],
  [OpenAPI-first typed frontend client: `@nestjs/swagger` → `openapi.json` →
   HeyApi; TanStack Query for server state.], [Accepted],
)
