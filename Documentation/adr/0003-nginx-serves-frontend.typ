#import "template.typ": adr, mermaid
#show: adr.with(
  "0003",
  "A dedicated nginx container serves the SPA and reverse-proxies the API",
  status: "Accepted",
  date: "2026-09-01",
)

= Context

The built Angular app must be served and must reach the API. Audio is streamed
with HTTP Range. Auth uses a cookie, so one origin avoids CORS.

= Options

+ *nginx container serves the SPA and proxies `/api`*
+ Express serves the static files
+ Separate origins (CDN + API domain, CORS)

= Decision

*Option 1.*

#mermaid(```mermaid
flowchart LR
  B["Browser"] -->|"https://host:8443/"| N["nginx"]
  N -->|"/ (static SPA, cached)"| S[("dist/")]
  N -->|"/api/* (no buffering)"| A["NestJS API :3000"]
```)

nginx handles TLS, compression and caching by config. One origin keeps the
cookie first-party (`SameSite=Lax`).

= Consequences

- Good: no CORS; static serving is off the Node process.
- Good: frontend and backend images build separately.
- Bad: one more image and config.
- Bad: upload limit (20 MB) set in both nginx and the API.
- Bad: proxy must not buffer streamed responses (`proxy_buffering off`).
- Rejected Express static: hand-written caching, backend rebuild on UI change.
- Rejected separate origins: CORS and a cross-site cookie.
