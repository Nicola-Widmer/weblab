#import "../lib.typ": adrlink, tbl

#pagebreak(weak: true)

= Architecture Decisions

One ADR per decision in `Documentation/adr/`.

#tbl(
  [ADR], [Decision],
  [#adrlink("0001-monorepo-monolith")], [One repo, one backend process.],
  [#adrlink("0002-ddd-hexagonal-backend")], [DDD + hexagonal modules, async
   in-process event bus.],
  [#adrlink("0003-nginx-serves-frontend")], [nginx serves the SPA and proxies
   `/api`.],
  [#adrlink("0004-metadata-postgres-blob-storage-port")], [PostgreSQL for
   metadata, audio behind a `FileStorage` port.],
  [#adrlink("0005-session-cookie-auth")], [Keycloak (OIDC), BFF session cookie,
   owner-scoped queries.],
  [#adrlink("0006-openapi-typed-client-tanstack-query")], [Generated OpenAPI
   client, TanStack Query.],
  [#adrlink("0007-frontend-component-communication")], [Presentational/container
   split, max two re-emits.],
)
