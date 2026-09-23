#import "template.typ": adr, mermaid
#show: adr.with(
  "0006",
  "OpenAPI-first typed frontend client; TanStack Query for server state",
  status: "Accepted",
  date: "2026-09-01",
)

= Context

The frontend needs typed API calls plus caching and loading states. A
hand-written client would be a second copy of the API contract.

= Options

+ *Generate `openapi.json` from the backend, generate the client from it, use
  TanStack Query*
+ Hand-written Angular services
+ Shared types package, hand-written client
+ tRPC (rejected: not REST)

= Decision

*Option 1.*

#mermaid(```mermaid
flowchart LR
  C["Controllers + DTOs"] -->|"pnpm openapi"| O["backend/openapi.json"]
  O -->|"pnpm generate:api"| G["frontend/src/app/api/"]
  G --> Q["TanStack Query options"]
  Q --> UI["Components"]
```)

Both generated outputs are committed. Swagger UI is at `/api/docs`.

= Consequences

- Good: the contract exists once, in the backend code.
- Good: the frontend builds without a running API.
- Good: TanStack Query removes hand-written loading/refetch code.
- Bad: two generate steps to remember; generated diffs in commits.
- Bad: the fetch client skips Angular `HttpClient` interceptors.
- Bad: OpenAPI 3.0 only (a `@nestjs/swagger` limit).
