#import "template.typ": adr, mermaid
#show: adr.with(
  "0001",
  "Single repository, single deployable backend",
  status: "Accepted",
  date: "2026-09-01",
)

= Context

One developer, one deadline. Frontend and backend usually change together, and
the system must start with `docker compose up`.

= Options

+ *Monorepo, one backend process*
+ Polyrepo — separate frontend and backend repos
+ Split the backend into several services now

= Decision

*Option 1.*

#mermaid(```mermaid
flowchart LR
  subgraph repo["one git repo"]
    FE["frontend/"]
    BE["backend/"]
    DC["docker-compose.yml"]
  end
  DC -->|"builds"| W["web image"]
  DC -->|"builds"| A["api image"]
```)

A change touching API and UI is one commit. Module boundaries (ADR-0002) keep
a later split possible.

= Consequences

- Good: one checkout, one build, atomic API + UI changes.
- Bad: two toolchains in one repo.
- Bad: a monolith can get tangled — ADR-0002's boundaries prevent that.
- Rejected polyrepo: version skew, cross-repo changes.
- Rejected services: network hops and deploy overhead for no gain.
