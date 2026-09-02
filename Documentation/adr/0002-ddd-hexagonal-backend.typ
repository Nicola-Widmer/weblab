#import "template.typ": adr
#show: adr.with(
  "0002",
  "DDD feature folders with hexagonal layering and an async event bus",
  status: "Accepted",
  date: "2026-09-02",
)

= Context and Problem Statement

The backend holds the business rules: upload validation, playlist ordering,
per-user authorization, and deletes that affect playlists and playback. The
proposal asks for a clear structure and a real test pyramid. How should the
backend be organised internally, and how should one part react to a change in
another?

= Decision Drivers

- A use case should be testable without a database or filesystem.
- The two resources have cross-effects (deleting a song affects playlists and
  playback).
- A reaction in one context should not be able to fail or block the triggering
  action in another — deleting a song must succeed even if playlist cleanup
  errors.
- The proposal's optional S3 storage should not require touching business logic.
- One developer returning to the code later needs visible boundaries.

= Considered Options

+ *DDD tactical patterns + hexagonal (ports & adapters) layering* — a feature
  folder (Nest module) per bounded context; the business layer depends on no
  framework or database code; infrastructure sits behind interfaces the business
  layer defines; contexts react to each other through asynchronous in-process
  domain events rather than direct calls.
+ *Layered MVC with an active-record ORM* — business logic on model classes.
+ *Transaction script* — one procedure per endpoint, SQL inline.

= Decision Outcome

Chosen: *option 1*. Business rules live in a layer that imports no framework or
database code, so they can be unit-tested directly. Database, filesystem and HTTP
sit at the edges behind interfaces that the business layer owns — which is also
what keeps the optional storage swap cheap.

Bounded contexts do not call into each other's internals. Where one must react to
another — a deleted song leaving every playlist, playback stopping when its track
is gone — the triggering use case publishes a domain event and returns;
subscribers in other contexts handle it afterwards, in the same process,
*fire-and-forget*. The publisher does not wait for them and does not learn
whether they succeeded, so the contexts stay decoupled and a slow or broken
handler cannot fail the original request. The price is that cross-context state
is eventually consistent and a dropped event leaves drift; a periodic
reconciliation sweep repairs it — the same mechanism
#link("0004-metadata-postgres-blob-storage-port.pdf")[ADR-0004] already uses for
orphaned audio files. The bus is in-memory: no message broker until there is a
second process.

== Module structure

One folder per bounded context under `backend/src/`, each a self-contained Nest
module:

- `domain/` — entities, value objects, domain events. Imports nothing from
  `@nestjs/*`, the ORM, or another context.
- `application/` — use cases as `@Injectable()` services, and the port
  interfaces they depend on (`SongRepository`, `FileStorage`). Handlers that
  react to other contexts' events live here.
- `infrastructure/` — adapters implementing the ports (Drizzle repositories,
  filesystem / S3 storage), bound to their ports in the module.
- `http/` — controller and DTO classes; the only place request and response
  shapes are defined.
- `<context>.module.ts` — wires ports to adapters, registers the controller and
  the event handlers.

A context may import from `shared/` and its own subtree, nothing else.
Cross-context event classes live in `shared/` so a subscriber never imports the
publisher. An ESLint boundary rule enforces the restriction.

== Edge framework: NestJS

The constraints name Express; the layering above needs module boundaries,
dependency injection and a validated HTTP edge, which on plain Express are all
hand-rolled. *NestJS* (on the Express platform) is used instead:

- One Nest module per bounded context maps directly onto the structure above;
  DI wires adapters to the ports. Nest appears at the edges — controllers,
  modules, adapters — and as bare DI markers on application services
  (`@Injectable()`, `@EventsHandler()`); the `domain/` layer imports nothing
  from `@nestjs/*`.
- `@nestjs/cqrs` supplies the event bus. Its `EventBus.publish()` dispatches to
  handlers without awaiting them, so the fire-and-forget semantics above are the
  default and no custom bus code is written. `CommandBus` / `QueryBus` are not
  used — use cases within a context are plain injected services, called
  directly.
- `@nestjs/swagger` reflects over the controllers and DTO classes to emit
  `backend/openapi.json` — the frontend contract
  (#link("0006-openapi-typed-client-tanstack-query.pdf")[ADR-0006]) is derived
  from the endpoint code, with no schema DSL and no hand-written spec. Plain
  Express plus a schema library (`zod`) or a codegen tool (`tsoa`) were the
  alternatives; both add a second description of every payload or a bespoke
  build step for less benefit here.

== Consequences

- Good: the core logic is I/O-free and fast to test; storage is swappable;
  boundaries are explicit.
- Good: DI and the module system come from the framework; the OpenAPI document
  is generated from the controllers/DTOs, not maintained separately.
- Good: an asynchronous bus keeps contexts decoupled — a failing playlist
  cleanup does not fail the song delete — and moving a context onto its own
  process later is swapping the in-memory bus for a broker, not rewriting
  callers.
- Bad: more indirection than MVC — interfaces, mapping between stored rows and
  domain objects, wiring. A deliberate cost for a small system.
- Bad: cross-context effects are eventually consistent. A handler that throws,
  or a crash mid-dispatch, drops the reaction — a song row gone but still listed
  in a playlist, and the mirror case in ADR-0004 — and fire-and-forget has no
  built-in retry, so the reconciliation sweep is not optional.
- Bad: framework coupling at the edge — controllers and adapters are Nest
  classes; DTOs must be classes (runtime reflection). The backend package is
  CommonJS (the Nest norm) while the frontend is ESM.
- Bad: the "just import the other module" shortcut has to be resisted; the
  ESLint boundary rule (see #emph[Module structure]) is the countermeasure.

= Pros and Cons of the Options

== Layered MVC with an active-record ORM

Familiar and quick to start, but when logic sits on model classes, testing it
without the database means mocking the ORM's finders, `save` / `update`,
associations and hooks — brittle enough that the tests usually become
integration tests against a real (or in-memory) database. Logic also tends to
spread into controllers. Plain MVC with injected services avoids both, but that
is already most of option 1.

== Transaction script

Minimal for plain CRUD, but the cross-cutting rules (ordering, cascade on
delete, ownership) get copied per endpoint and drift, with no home for
invariants.

= More Information

Tactical patterns from Evans and Vernon; ports & adapters from Cockburn. The
reconciliation approach for dropped cross-context effects mirrors
#link("0004-metadata-postgres-blob-storage-port.pdf")[ADR-0004]'s handling of
orphaned files.
