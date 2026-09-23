#import "../lib.typ": tbl

#pagebreak(weak: true)

= Architecture Constraints

#tbl(
  [Constraint], [Consequence],
  [Angular SPA], [TypeScript, standalone components.],
  [NestJS REST API], [No GraphQL, no SSR.],
  [PostgreSQL], [Metadata only. Forward-only migrations (Drizzle).],
  [Audio on the server filesystem; S3 optional], [Storage sits behind a port.],
  [Vitest, Supertest, Playwright], [Ports must be fakeable. Vitest replaces the
   proposal's Jest.],
  [Docker Compose], [Every dependency is a service; config via env vars.],
  [Evergreen browsers], [`<audio>` and Media Session API assumed.],
  [One developer, fixed deadline], [Scope guarded by MoSCoW.],
)

*Conventions:* DDD + hexagonal backend, one module per bounded context.
Decisions are ADRs (`Documentation/adr/`). ESLint + Prettier everywhere.
