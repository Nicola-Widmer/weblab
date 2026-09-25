#import "../lib.typ": tbl

#pagebreak(weak: true)

= Risks and Technical Debt

#tbl(columns: (auto, 1fr, 1fr),
  [Area], [Problem], [Status],
  [E2E / a11y isolation], [Tests share one user and one database. A failed
   test can leave data behind.], [Tests run serially and clean up. Fine for one
   developer.],
  [Event-chain depth], [The two-re-emit rule (ADR-0007) is not linted.],
  [Checked in review.],
  [pa11y login], [Each scanned URL logs in again.], [Fine for 3 URLs.],
  [Bundle size], [Initial bundle over Angular's 1 MB warning.], [Low priority:
   self-hosted.],
  [S3 storage], [Adapter not built; only local filesystem.], [Optional (Could).],
  [Logging and telemetry], [Only a few places log, via NestJS's default
   console `Logger` (OIDC controller, session sweeper, playlist sweep).
   No structured (JSON) logs, no request or correlation IDs, and nothing
   logs the async domain events. No metrics, tracing or health endpoint.
   The frontend reports no errors.], [Open. Failures in production show up
   only in container stdout. A fix would add structured logging (e.g.
   pino), a health check and OpenTelemetry.],
  [Dev credentials], [The compose stack is dev-only. The Keycloak realm import
   seeds user `dev`/`dev` and client secret `dev-secret-change-me`. Keycloak
   runs `start-dev` with admin `admin`/`admin` and self-registration on.
   Postgres (`wmp`) and MinIO (`minioadmin`) also fall back to default
   credentials.], [Accepted for local use. Before any deployment: separate
   realm without seeded users, generated client secret, `start` mode, and
   secrets from env vars without `:-default` fallbacks.],
)
