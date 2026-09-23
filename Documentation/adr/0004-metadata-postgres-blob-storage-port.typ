#import "template.typ": adr, mermaid
#show: adr.with(
  "0004",
  "PostgreSQL for metadata; audio files behind a storage abstraction",
  status: "Accepted",
  date: "2026-09-01",
)

= Context

Two kinds of data: small records (songs, playlists, users) and MP3s up to
20 MB. The default must run without a cloud account. S3 is an optional extra.
Audio needs range reads.

= Options

+ *PostgreSQL for metadata, audio behind a `FileStorage` port*
+ Store MP3s in PostgreSQL (`BYTEA`)
+ Call the filesystem directly, add S3 later

= Decision

*Option 1.*

#mermaid(```mermaid
flowchart LR
  UC["SongsService"] --> SR["SongRepository"] --> PG[("PostgreSQL")]
  UC --> FS["FileStorage port"]
  FS --> L["LocalFileStorage (default)"]
  FS --> M["InMemoryFileStorage (tests)"]
  FS -.-> S3["S3 adapter (not built)"]
```)

A song row stores an opaque key. Delete order: row first, then files. A failed
file delete leaves an orphan file, which is harmless.

= Consequences

- Good: use cases don't know where bytes live.
- Good: the database and its backups stay small.
- Bad: two stores can drift (orphan files).
- Bad: each adapter needs its own tests.
- Rejected BYTEA: bloats the database and its backups.
- Rejected direct filesystem: S3 would later leak into use cases.
