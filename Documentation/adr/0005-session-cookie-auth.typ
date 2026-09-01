#import "template.typ": adr
#show: adr.with(
  "0005",
  "Server-side session cookie; ownership enforced in the application layer",
  status: "Accepted",
  date: "2026-09-01",
)

= Context and Problem Statement

Stories AUTH-1 and AUTH-2 require email/password sign-in with every song and
playlist private to its owner. Passwords are stored only as bcrypt hashes; there
is no email verification or password reset. How is a session represented, and
where is the "this resource belongs to this user" check made?

= Decision Drivers

- Other users' resources must return 403/404 on every endpoint (proposal).
- The SPA and API are one origin
  (#link("0003-nginx-serves-frontend.pdf")[ADR-0003]), so the cookie can be
  first-party.
- One developer, no external identity provider.
- Sign-out must actually end the session (proposal: cookie cleared on sign-out).
- The proposal's auth-disabled mode: one implicit local user owns everything.

= Considered Options

+ *Opaque session identifier in a cookie, session state stored server-side* (in
  PostgreSQL); ownership checked in the application layer via owner-scoped
  queries.
+ *Stateless signed token (JWT)* in a cookie or header, no server-side session
  state.
+ *Ownership checked only in HTTP middleware*, not in the application layer.

= Decision Outcome

Chosen: *option 1*. The cookie carries only an opaque id; the session record
lives server-side so sign-out can delete it and a session can be revoked. Cookie
flags are set appropriately (`HttpOnly` always; `Secure` in production behind
TLS). Anonymous requests are rejected at the HTTP edge, and every use case
additionally scopes its data access to the authenticated user, so a request for
someone else's resource returns 403/404 by construction. With auth disabled, a
fixed local user is used and the cookie is skipped.

== Consequences

- Good: sessions are revocable and sign-out is real; the cookie is not readable
  by JavaScript.
- Good: the ownership guarantee sits with the data access, not only at the edge,
  and is straightforward to test.
- Good: a first-party `SameSite=Lax` cookie needs no CORS and blocks cross-site
  POST (CSRF) in the common cases; a token can be added later if a form is ever
  posted cross-site.
- Bad: a session lookup per request; auth depends on PostgreSQL.
- Bad: every data-access path must remember to scope by owner — enforced by
  convention, tests and review.

= Pros and Cons of the Options

== Stateless JWT

No session store and no per-request lookup — but it cannot be revoked before
expiry, which undermines sign-out and incident response, and key rotation and
clock skew add their own handling.

== Ownership in middleware only

Less repetition, but a new route that forgets the guard leaks data silently, and
the check sits far from the data it protects.

= More Information

No email verification or password reset is a stated limitation of the proposal.
Related: #link("0003-nginx-serves-frontend.pdf")[ADR-0003].
