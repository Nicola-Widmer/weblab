#import "template.typ": adr
#show: adr.with(
  "0001",
  "Single repository, single deployable backend",
  status: "Accepted",
  date: "2026-09-01",
)

= Context and Problem Statement

The Web Music Player has an Angular frontend and an Express.js REST backend, built
by one developer against an academic deadline. How should the code be organised
and shipped — one repository or several, and the backend as one service or split
into parts?

= Decision Drivers

- One developer, tight deadline — coordination overhead should be minimal.
- The proposal requires the whole system to come up with `docker compose up`.
- Frontend and backend change together; a feature often touches both.
- The architecture should stay small enough to explain.

= Considered Options

+ *Monorepo, monolithic backend* — one repository holding the frontend, the
  backend and the Compose file; the backend runs as a single service.
+ *Polyrepo* — separate repositories for frontend and backend, released
  independently.
+ *Split the backend into separate services now.*

= Decision Outcome

Chosen: *option 1*. A team of one and the "one command up" constraint both point
to a single repository and a single backend process. A change that spans the API
and the UI is one commit. Splitting later stays possible — see
#link("0002-ddd-hexagonal-backend.pdf")[ADR-0002] for the internal boundaries
that keep that option open — and the cost of distributing the system is not worth
paying now.

== Consequences

- Good: one checkout, one build, one CI pipeline; API and UI changes are atomic.
- Neutral: frontend and backend share a repository, a version and a release by
  choice; they may still be packaged as separate images
  (#link("0003-nginx-serves-frontend.pdf")[ADR-0003]).
- Bad: the repository carries two toolchains.
- Bad: a monolith can erode into a tangle — the module boundaries in ADR-0002
  are the countermeasure.

= Pros and Cons of the Options

== Polyrepo

Cleaner separation and independent releases, but version skew between API and
client, cross-repository changes, and duplicated setup — overhead a single
developer does not need.

== Separate services now

Hard boundaries, but network hops, partial-failure handling and multiple deploy
units — more than this project warrants.

= More Information

Revisit if the project gains contributors or needs to scale parts independently.
