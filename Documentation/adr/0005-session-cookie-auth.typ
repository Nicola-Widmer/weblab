#import "template.typ": adr
#show: adr.with(
  "0005",
  "OIDC via Keycloak; ownership enforced in the application layer",
  status: "Accepted",
  date: "2026-09-07",
)

// Filename kept as `0005-session-cookie-auth` so existing `#adrlink` references
// and the docs index do not break; the decision below supersedes the original
// server-side session-cookie design.

= Context and Problem Statement

Stories AUTH-1 and AUTH-2 require sign-in with every song and playlist private
to its owner. The original decision here was a hand-rolled email/password store
with bcrypt hashes and opaque server-side session records. Running our own
credential store means owning password reset, lockout, rotation and storage
hardening for no product benefit. How are users authenticated, how is a request
tied to a user, and where is the "this resource belongs to this user" check
made?

= Decision Drivers

- Other users' resources must return 403/404 on every endpoint (proposal).
- No value in operating our own password storage, reset and lockout flows.
- The SPA and API are one origin
  (#link("0003-nginx-serves-frontend.pdf")[ADR-0003]).
- Sign-out must actually end access from the app's point of view.
- The proposal's auth-disabled mode: one implicit local user owns everything.
- Keep the identity provider swappable — anything speaking OIDC should fit.

= Considered Options

+ *Delegate authentication to Keycloak (OIDC).* Keycloak runs as its own
  container with its own PostgreSQL database (`keycloak-db`, separate from the
  application database). The backend is an OAuth2 resource server: it validates
  the realm-issued JWT access token on every request (signature via the realm
  JWKS, `iss` and `aud` checked) and derives the user from the `sub` claim.
  Ownership is checked in the application layer via owner-scoped queries.
+ *Hand-rolled email/password with server-side session cookies* (the original
  ADR-0005 decision).
+ *Stateless first-party JWT minted by our own backend*, no external IdP.
+ *Ownership checked only in HTTP middleware*, not in the application layer.

= Decision Outcome

Chosen: *option 1*. Keycloak is always part of the Compose stack (not an
optional profile) and owns credentials, login UI, self-registration, password
reset and token issuance. The realm has `registrationAllowed` and
`resetPasswordAllowed` on; `GET /api/auth/login?register=1` sends the browser to
Keycloak's sign-up form and the callback is identical to a normal login, so a
new account costs no backend code — `resolveUser` JIT-provisions the projection
row on first sight. Email verification stays off (it needs realm SMTP), matching
the proposal's stated limitation. The backend trusts only tokens from the
configured realm (`OIDC_ISSUER_URL`, `OIDC_AUDIENCE`) and every use case
additionally scopes its data access to the authenticated user, so a request for
someone else's resource returns 403/404 by construction. Anonymous requests are
rejected at the HTTP edge. With `AUTH_ENABLED=false`, a fixed local user is used
and no token is required.

The application database keeps a thin `users` table that is a *projection of*
Keycloak, not a second identity store: one row per user, `id` = the Keycloak
`sub`, with a cached `email` / display name for rendering ownership without
calling Keycloak. It is JIT-provisioned on the first authenticated request and
holds no credentials. Its purpose is to anchor the existing
`songs.owner_id` / `playlists.owner_id` foreign keys (a Postgres FK needs the
referenced row in the same database) and to keep `ON DELETE CASCADE` working.
Keycloak remains the source of truth; a user removed there leaves a stale row
until a reconciliation sweep (or a Keycloak event hook) prunes it.

Token transport is a *backend-for-frontend (BFF) session cookie*. The backend is
a confidential OIDC client: `/auth/login` redirects to Keycloak, `/auth/callback`
exchanges the code, and the access and refresh tokens are held server-side in a
`sessions` row. The browser gets only an opaque `HttpOnly; Secure; SameSite=Lax`
cookie carrying the session id. This keeps `<audio src>` / `<img src>` requests
working with no client-side token handling, keeps no token in JavaScript or a
URL, and lets `/auth/logout` delete the row and call Keycloak's end-session
endpoint for a real sign-out. The backend refreshes the access token via the
refresh-token grant when it nears expiry; a failed refresh surfaces as `401` and
the SPA redirects to `/auth/login`. The bearer-header alternative was rejected
because the media `<audio>`/`<img>` elements cannot send an `Authorization`
header without giving up HTTP Range streaming.

== Consequences

- Good: no password storage, reset or lockout code in this project; MFA, social
  login and account management come from Keycloak for free.
- Good: the ownership guarantee sits with the data access, not only at the edge,
  and is straightforward to test.
- Good: the IdP is swappable — any OIDC provider works by changing the issuer.
- Good: standard, well-reviewed protocol instead of a bespoke scheme.
- Good: with the BFF cookie no token reaches the browser, media elements need
  no special handling, and sign-out is real (row deleted + Keycloak
  end-session).
- Bad: the backend is now a confidential OIDC client — it owns the
  login/callback redirect, server-side token storage and refresh, and needs
  `OIDC_CLIENT_SECRET`.
- Bad: a second stateful service and a second database to run and back up;
  local dev and CI must start Keycloak (slow first boot) or set
  `AUTH_ENABLED=false`.
- Bad: JWT access tokens are valid until they expire; true immediate revocation
  needs either short token lifetimes plus refresh, or a backend token
  introspection call. We accept short-lived access tokens.
- Bad: the local `users` projection can drift from Keycloak (deleted or renamed
  users) until reconciled.
- Bad: every data-access path must still remember to scope by owner — enforced
  by convention, tests and review.

= Pros and Cons of the Options

== Hand-rolled email/password with session cookies

Full control and no extra service, but we own password hashing, reset, lockout
and session storage, and the proposal already rules out email verification and
reset — so the feature is permanently half-built. Rejected in favour of
delegating to Keycloak.

== Stateless first-party JWT

No session store, but still requires us to run a credential store and login
flow, and adds key management and clock-skew handling — the cost of an IdP
without the benefits.

== Ownership in middleware only

Less repetition, but a new route that forgets the guard leaks data silently, and
the check sits far from the data it protects.

= More Information

Keycloak and its database are defined in `docker-compose.yml` (`keycloak`,
`keycloak-db`); realm JSON placed in `keycloak/import/` is loaded on first
start. The `identity` slice validates tokens behind a `TokenVerifier` port
(`jose` + realm JWKS in production, a fake signer in tests) so the test suite
never starts Keycloak. Related:
#link("0003-nginx-serves-frontend.pdf")[ADR-0003],
#link("0002-ddd-hexagonal-backend.pdf")[ADR-0002].
