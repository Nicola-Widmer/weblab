#pagebreak(weak: true)

= Context and Scope

== Business Context

The system is self-contained: the only external actor is the *user* in a
browser. There is no third-party integration in the committed scope (no email
provider — email verification and password reset are explicitly out of scope).
An *operator* deploys and runs the Compose stack.

```
        ┌──────────────┐
        │     User     │  uploads MP3s · manages playlists · plays music
        │  (browser)   │
        └──────┬───────┘
               │
        ┌──────▼───────────────┐
        │   Web Music Player   │   (this system)
        └──────────────────────┘
               ▲
        ┌──────┴───────┐
        │   Operator   │  runs `docker compose up`, provides configuration
        └──────────────┘
```

== Technical Context

#table(
  columns: (auto, auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Channel], [Protocol], [Payload / purpose],
  [Browser ↔ nginx], [HTTPS], [SPA assets (HTML/JS/CSS); REST/JSON API calls;
   audio stream with `Range` / `206`.],
  [nginx ↔ Express API], [HTTP (proxy)], [Reverse-proxied `/api/*`; `Range`,
   `X-Forwarded-*` headers passed through.],
  [Express API ↔ PostgreSQL], [TCP (pg wire)], [Song & playlist metadata, users,
   session records.],
  [Express API ↔ Blob storage], [filesystem calls _or_ S3 HTTP API],
  [Read/write/delete audio objects; range reads for streaming.],
)

```
   ┌──────────┐  HTTPS   ┌─────────┐  HTTP   ┌──────────────┐
   │ Browser  │─────────▶│  nginx  │────────▶│  Express API │
   │  (SPA)   │◀─────────│  proxy  │◀────────│ DDD / hexa.  │
   └──────────┘          └─────────┘         └──┬────────┬──┘
                                               │        │
                                     pg wire   │        │  fs / S3
                                        ┌──────▼──┐  ┌──▼───────────────┐
                                        │Postgres │  │ Blob storage     │
                                        │metadata │  │ local FS default │
                                        │sessions │  │ or S3-compatible │
                                        └─────────┘  └──────────────────┘
```

== Scope Boundaries

#table(
  columns: (1fr, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [In scope], [Out of scope],
  [MP3 upload with validation and ID3 extraction; song & playlist CRUD;
   record-player playback with seek / repeat / volume / resume; range streaming;
   session-cookie auth with per-user isolation; optional S3 storage backend.],
  [Email verification & password reset; audio transcoding or non-MP3 formats;
   sharing / collaboration / social features; native mobile apps; multi-tenant
   administration; CDN and horizontal scaling (considered only as an evolution
   path).],
)
