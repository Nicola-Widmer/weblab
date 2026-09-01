#import "template.typ": adr
#show: adr.with(
  "0006",
  "OpenAPI-first typed frontend client; TanStack Query for server state",
  status: "Accepted",
  date: "2026-09-01",
)

= Context and Problem Statement

The Angular SPA talks to the NestJS REST API over JSON. The backend already
describes every request and response as a DTO class with `class-validator` rules
(#link("0002-ddd-hexagonal-backend.pdf")[ADR-0002], per-context HTTP edge). How
does the frontend get types for those payloads, an HTTP client to call them, and
a caching/loading/error story for server state — without a second
hand-maintained copy of the contract drifting from the first?

= Decision Drivers

- One developer: a hand-written client and hand-written response interfaces are
  two more things to keep in sync with the API by memory.
- The contract should have exactly one source of truth.
- `docker compose up` and CI must not need both halves running at once to build
  the frontend.
- Server state needs caching, request de-duplication, and consistent
  loading/error handling; the proposal's NFR-1 asks for exactly that UX.
- The playback store is *client* state and is out of scope here — it stays a
  signal store in `features/player/`.

= Considered Options

+ *Derive an OpenAPI document from the backend, then generate the frontend client
  from that document* (`@nestjs/swagger` reflects over the controllers and DTO
  classes -> `openapi.json` -> `@hey-api/openapi-ts`), and use *TanStack Query*
  for server-state caching.
+ *Hand-write a typed Angular service layer* (`HttpClient` + interfaces per
  endpoint), state in plain signals or a store.
+ *Share a types package* between backend and frontend in the monorepo; still a
  hand-written client.
+ *tRPC-style end-to-end types* — rejected outright: a TypeScript-RPC transport,
  against the REST constraint.

= Decision Outcome

Chosen: *option 1*.

- `@nestjs/swagger` builds an OpenAPI 3.0 document from the same controllers and
  DTO classes the API runs on — decorators give the method/path, the DTO types
  and their `class-validator` rules give the schemas
  (#link("0002-ddd-hexagonal-backend.pdf")[ADR-0002], "Edge framework").
  `backend/openapi.json` is generated (`pnpm openapi`) and *committed*; Swagger
  UI is served at `/api/docs` and the raw document at `GET /api/openapi.json`.
- The method/path/schema triple is never hand-copied into a second OpenAPI
  fragment — there is no schema DSL and no annotation block, just the endpoint
  code.
- `@hey-api/openapi-ts` generates `frontend/src/app/api/` from that file: a
  fetch client (`baseUrl: /api`, `credentials: include` — one origin, first-party
  session cookie, #link("0003-nginx-serves-frontend.pdf")[ADR-0003] /
  #link("0005-session-cookie-auth.pdf")[ADR-0005]), typed request/response
  models, and TanStack Query option factories. The output is committed.
- CI (when added) regenerates both artefacts and fails on a non-empty
  `git diff`, so drift is a red build rather than a runtime surprise.
- `@tanstack/angular-query-experimental` owns server-state caching,
  de-duplication and loading/error flags.

== Consequences

- Good: the request/response contract exists once (backend controllers + DTOs).
  Client code and models are generated, not maintained.
- Good: the frontend build is hermetic — it reads a committed file, not a live
  API. Contract drift is caught in CI.
- Good: TanStack Query removes most hand-rolled loading/error/refetch code.
- Bad: two code-generation steps in the workflow; forgetting to re-run and
  commit is possible (mitigated by the CI diff check).
- Bad: generated code is committed and reviewed as a diff — noisier PRs.
- Bad: the fetch client bypasses Angular `HttpClient` interceptors; the only
  cross-cutting concern (the session cookie) is handled by `credentials:
  include`, and anything future goes in the generated client's runtime config.
- Bad: `@nestjs/swagger` must represent every payload shape used at the HTTP
  edge; unusual types may need an explicit `@ApiProperty` or simplification.
- Bad: the document is OpenAPI 3.0, not 3.1 (a `@nestjs/swagger` limitation);
  HeyApi consumes it fine and no 3.1-only construct is needed.

= More Information

Related: #link("0002-ddd-hexagonal-backend.pdf")[ADR-0002] (NestJS edge, how the
document is derived), #link("0003-nginx-serves-frontend.pdf")[ADR-0003] (one
origin), #link("0005-session-cookie-auth.pdf")[ADR-0005] (first-party cookie).
