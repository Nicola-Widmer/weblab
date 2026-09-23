#import "../lib.typ": mermaid, tbl

#pagebreak(weak: true)

= Context and Scope

== Business Context

#mermaid(```mermaid
flowchart LR
  U(["User (browser)"]) -->|"upload, organise, play"| S["Web Music Player"]
  O(["Operator"]) -->|"docker compose up, env config"| S
  S -->|"login, registration"| K["Keycloak (bundled)"]
```)

No external services. No email provider: verification and password reset are
out of scope.

== Technical Context

#mermaid(```mermaid
flowchart LR
  B["Browser (SPA)"] -->|"HTTPS"| N["nginx"]
  B -->|"OIDC login redirect"| K["Keycloak"]
  N -->|"HTTP /api"| A["NestJS API"]
  A -->|"SQL"| P[("PostgreSQL")]
  A -->|"OIDC code exchange, JWKS"| K
  A -->|"fs"| F[("Audio storage")]
  K -->|"SQL"| KP[("keycloak-db")]
```)

== Scope

#tbl(columns: (1fr, 1fr),
  [In scope], [Out of scope],
  [MP3 upload + ID3 tags, song & playlist CRUD, record-player playback (seek,
   repeat, volume, resume), range streaming, Keycloak login, per-user data.],
  [Email verification, password reset, non-MP3 formats, sharing, native apps,
   horizontal scaling.],
)
