#pagebreak(weak: true)

= Architecture Constraints

== Technical Constraints

#table(
  columns: (auto, auto),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  align: (left + horizon, left + horizon),
  [Constraint], [Consequence],
  [Frontend framework: *Angular*], [SPA, TypeScript, standalone components.],
  [Backend: *NestJS* (Express platform), REST], [Node.js/TypeScript HTTP layer;
   no GraphQL, no SSR. OpenAPI spec derived from controllers/DTOs (see ADR-0002).],
  [Database: *PostgreSQL*], [Relational metadata store; SQL migrations.],
  [Audio bytes on the *server filesystem* (mounted volume), DB holds the path;
   S3-compatible storage is an optional (Could) alternative],
  [A storage abstraction is needed so the backend is not hard-wired to `fs`.],
  [Tests: *Vitest* (unit; Jest-compatible API, native ESM — replaces the
   proposal's Jest on both halves), *Supertest* + real PostgreSQL
   (integration), *Playwright* (E2E)], [Ports must be mockable; integration
   tests need a real DB (and MinIO for the S3 path).],
  [Packaging: *Docker Compose*, `docker compose up`],
  [Every runtime dependency is a Compose service; config comes from env vars.],
  [Target: modern evergreen browsers], [No IE/legacy shims; `<audio>` + Media
   Session API assumed available.],
)

== Organisational Constraints

- *Single developer*, fixed academic deadline — scope is protected by the MoSCoW
  list in the proposal.
- Solo work — architecture must be navigable without a team to ask.

== Conventions

- Backend follows *Domain-Driven Design* (tactical patterns) with a
  *hexagonal* (ports & adapters) layering; one module per bounded context.
- Significant decisions are recorded as *ADRs* under `Documentation/adr/`
  (MADR-style, numbered, immutable) and referenced from section 9.
- TypeScript everywhere; ESLint + Prettier; SQL migrations are forward-only.
