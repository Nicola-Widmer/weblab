#import "template.typ": adr
#show: adr.with(
  "0004",
  "PostgreSQL for metadata; audio files behind a storage abstraction",
  status: "Proposed",
  date: "2026-09-01",
)

= Context and Problem Statement

Two kinds of data must be persisted: small structured records (song and playlist
metadata, users, sessions) and large MP3 blobs (up to 20 MB each). The proposal
fixes PostgreSQL for metadata and the server filesystem for audio, and lists
S3-compatible object storage as an optional improvement for running on more than
one node, chosen by configuration. How should this be structured so the optional
path is not a rewrite?

= Decision Drivers

- `docker compose up` must work with no cloud account — the default cannot be S3.
- The proposal's multi-node option should be reachable by configuration.
- Audio needs range reads for seeking (proposal: HTTP Range support).
- Deleting a song must not leave the file behind.
- The proposal requires the S3 path to be covered by integration tests (MinIO).

= Considered Options

+ *PostgreSQL for metadata; audio bytes behind a storage interface*, with a
  local-filesystem implementation (default) and an S3-compatible one, selected
  by configuration.
+ *Store the MP3s in PostgreSQL too* (as `BYTEA` or large objects).
+ *Use the local filesystem directly in the code now*; add S3 later if needed.

= Decision Outcome

Chosen: *option 1*. Metadata rows reference audio by an opaque key; the business
layer moves bytes only through the storage interface, so which backend is in use
is a configuration choice and the S3 path is a second implementation of one
interface rather than a change to use cases. The local implementation keeps the
default cloud-free.

Deleting a song removes the metadata row and the stored file. Because an external
file or object delete cannot be part of the database transaction, the two are
ordered and any leftover file is reconciled separately — the exact approach is an
implementation detail.

== Consequences

- Good: business logic does not depend on where the bytes live; switching to S3
  is configuration plus a tested implementation.
- Good: PostgreSQL and its backups stay small.
- Bad: two stores to keep consistent — a partial failure can leave an orphaned
  file or (less likely) a dangling row; needs delete-ordering and a
  reconciliation step.
- Bad: two implementations to test and maintain.

= Pros and Cons of the Options

== MP3s in PostgreSQL

One store, one backup, atomic writes — but large blobs inflate the database, its
write-ahead log and its backups, do not stream as naturally as files or object
storage, and this does not help the multi-node goal.

== Filesystem directly in the code

Least code today, but the S3 option then reaches into the use cases; the
interface is cheap to add now.

= More Information

Related: #link("0003-nginx-serves-frontend.pdf")[ADR-0003] (the front proxy and
where audio bytes are served from).
