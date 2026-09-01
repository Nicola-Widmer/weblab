#import "template.typ": adr
#show: adr.with(
  "0003",
  "A dedicated nginx container serves the SPA and reverse-proxies the API",
  status: "Accepted",
  date: "2026-09-01",
)

= Context and Problem Statement

The built Angular bundle must be served to browsers, and the SPA must reach the
Express API. Two common topologies: the API serves the static bundle itself, or a
dedicated web server sits in front. The app streams MP3 audio (the proposal
requires HTTP Range support) and uses a session cookie.

= Decision Drivers

- Serving static assets, compression, caching and TLS should not have to be
  written in application code.
- One public origin, so the session cookie is first-party and no CORS is needed.
- `docker compose up` stays simple.
- A production-like topology has some assessment value.

= Considered Options

+ *A dedicated web/proxy container* (nginx) serving the static bundle and
  reverse-proxying `/api` to the backend, terminating TLS.
+ *The Express app serves the static bundle* (`express.static` + SPA fallback);
  one container.
+ *Separate origins* — a static host / CDN for the SPA, the API on its own
  domain, with CORS and a cross-site cookie.

= Decision Outcome

Chosen: *option 1*. A static web server handles asset serving, compression,
cache headers and TLS through configuration rather than application code, in a
process separate from the Node app. Routing `/api` through the same server keeps
the browser and API on one origin, so the session cookie stays first-party
(`SameSite=Lax`) with no CORS. The Compose stack stays small (web, api, db, and
the optional storage service).

How audio bytes are ultimately delivered — proxied through the API, served by the
proxy directly, or fetched from storage-provided URLs — is left to
#link("0004-metadata-postgres-blob-storage-port.pdf")[ADR-0004] and
implementation; the reverse-proxy topology keeps all three open.

== Consequences

- Good: one origin, no CORS; asset serving, compression, caching and TLS are
  configuration, and that work is off the Node process.
- Good: frontend and backend images build independently; a CDN can be placed in
  front later without code changes.
- Bad: one more image and a proxy config to maintain; a second component to
  check when a request 404s.
- Bad: the upload size limit must be set in two places (proxy and API) and kept
  in sync.
- Bad: the proxy must be configured to pass through what the API needs
  (forwarded headers) and not buffer streamed responses.

= Pros and Cons of the Options

== Express serves the static bundle

Smallest setup — one container, no proxy, no CORS — but asset caching and
compression headers are written by hand, the Node process does the file serving,
and a frontend-only change rebuilds the backend image.

== Separate origins

Clean static hosting and easy CDN, but CORS everywhere and a weaker cross-site
cookie (`SameSite=None; Secure`), for more moving parts than this needs.

= More Information

Related: #link("0005-session-cookie-auth.pdf")[ADR-0005] (one origin is what
lets the cookie be first-party) and ADR-0004 (where the audio bytes come from).
