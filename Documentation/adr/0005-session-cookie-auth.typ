#import "template.typ": adr, mermaid
#show: adr.with(
  "0005",
  "OIDC via Keycloak; ownership enforced in the application layer",
  status: "Accepted",
  date: "2026-09-07",
)

// Filename kept for stable links; this replaces the original hand-rolled
// session-cookie design.

= Context

Users sign in (AUTH-1, AUTH-2), and all data is private to its owner. Running
our own password store means building reset, lockout and hashing ourselves.
`<audio>` and `<img>` cannot send an `Authorization` header.

= Options

+ *Keycloak (OIDC); API is a confidential client with a session cookie (BFF);
  owner check in every query*
+ Own email/password store with session cookies
+ Own JWTs, no identity provider
+ Owner check only in HTTP middleware

= Decision

*Option 1.*

#mermaid(```mermaid
sequenceDiagram
  actor B as Browser
  participant API
  participant K as Keycloak
  participant DB as sessions table
  B->>API: GET /api/auth/login
  API-->>B: redirect to Keycloak
  B->>K: sign in / register
  K-->>B: redirect with code
  B->>API: GET /api/auth/callback
  API->>K: exchange code
  API->>DB: store access + refresh token
  API-->>B: cookie = session id (HttpOnly, Secure, SameSite=Lax)
  B->>API: GET /api/songs (cookie)
  API->>API: load session, refresh if needed, query by ownerId
```)

- Keycloak runs in Compose with its own database.
- The app keeps a thin `users` table (id = Keycloak `sub`) so foreign keys work.
- Every repository query is scoped by `ownerId` — other users' data is `404`.
- Logout deletes the session and ends the Keycloak session.
- `AUTH_ENABLED=false` uses one fixed local user.

= Consequences

- Good: no password code in this project; registration comes free.
- Good: no token in the browser; media requests work with the cookie.
- Good: any OIDC provider fits.
- Bad: an extra service + database; slow first boot.
- Bad: the API must store and refresh tokens and needs a client secret.
- Bad: local `users` rows can go stale if a user is deleted in Keycloak.
- Bad: owner scoping relies on convention and tests.
