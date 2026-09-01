#import "template.typ": adr
#show: adr.with(
  "0002",
  "DDD tactical patterns with hexagonal layering in the backend",
  status: "Accepted",
  date: "2026-09-01",
)

= Context and Problem Statement

The backend holds the business rules: upload validation, playlist ordering,
per-user authorization, and deletes that affect playlists and playback. The
proposal asks for a clear structure and a real test pyramid. How should the
backend be organised internally?

= Decision Drivers

- A use case should be testable without a database or filesystem.
- The two resources have cross-effects (deleting a song affects playlists).
- The proposal's optional S3 storage should not require touching business logic.
- One developer returning to the code later needs visible boundaries.

= Considered Options

+ *DDD tactical patterns + hexagonal (ports & adapters) layering* — a module per
  bounded context; the business layer depends on no framework or database code;
  infrastructure sits behind interfaces the business layer defines; contexts
  react to each other through in-process events rather than direct calls.
+ *Layered MVC with an active-record ORM* — business logic on model classes.
+ *Transaction script* — one procedure per endpoint, SQL inline.

= Decision Outcome

Chosen: *option 1*. Business rules live in a layer that imports no framework or
database code, so they can be unit-tested directly. Database, filesystem and HTTP
sit at the edges behind interfaces that the business layer owns — which is also
what keeps the optional storage swap cheap. Bounded contexts do not call into
each other's internals; where one must react to another (a deleted song leaving
playlists), that goes through an in-process event, kept synchronous — no message
broker until there is a second process.

== Edge framework: NestJS

The constraints name Express; the layering above needs module boundaries,
dependency injection and a validated HTTP edge, which on plain Express are all
hand-rolled. *NestJS* (on the Express platform) is used instead:

- One Nest module per bounded context maps directly onto the structure above;
  DI wires `@Injectable()` adapters to the ports; the domain layer still imports
  no framework code (Nest lives only in `*.controller.ts`, `*.module.ts`,
  adapters).
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
- Good: leaves the door open to splitting into services later.
- Bad: more indirection than MVC — interfaces, mapping between stored rows and
  domain objects, wiring. A deliberate cost for a small system.
- Bad: framework coupling at the edge — controllers and adapters are Nest
  classes; DTOs must be classes (runtime reflection). The backend package is
  CommonJS (the Nest norm) while the frontend is ESM.
- Bad: the "just import the other module" shortcut has to be resisted; may need
  a lint rule.

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

Tactical patterns from Evans and Vernon; ports & adapters from Cockburn.
