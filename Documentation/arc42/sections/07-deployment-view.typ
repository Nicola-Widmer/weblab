#import "../lib.typ": mermaid, tbl

#pagebreak(weak: true)

= Deployment View

One Docker Compose stack (`docker compose up`).

#mermaid(```mermaid
flowchart LR
  B["Browser"] -->|":8443 HTTPS"| web
  B -->|":8081 login"| kc
  subgraph compose["docker compose"]
    web["web: nginx + SPA"] -->|":3000"| api["api: NestJS"]
    api --> db[("db: postgres 17")]
    api --> up[("volume: uploads")]
    api --> kc["keycloak"]
    kc --> kcdb[("keycloak-db: postgres 17")]
  end
```)

#tbl(
  [Service], [Notes],
  [`web`], [nginx with the built SPA. Ports 8080 / 8443. Self-signed cert.],
  [`api`], [Runs migrations on start. Only reachable through `web`.],
  [`db`], [App database. Volume `db-data`.],
  [`keycloak`], [Imports the realm from `keycloak/import/` on first start.],
  [`keycloak-db`], [Keycloak's own database.],
  [`minio`], [Only with `--profile storage-s3`. Not used by the API yet.],
)

*Native dev:* `pnpm dev` runs Postgres in Docker and the API and SPA with hot
reload (`mprocs`). SPA on `:4200`.
