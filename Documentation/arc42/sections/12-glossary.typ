#pagebreak(weak: true)

= Glossary

#table(
  columns: (auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Term], [Definition],
  [Aggregate / Aggregate root], [A cluster of domain objects treated as one unit
   for data changes; the root is its only external entry point and guards its
   invariants.],
  [Value Object], [An immutable, equality-by-value domain type with no identity
   (e.g. `Email`).],
  [Bounded Context], [A boundary within which a domain model and its terms have
   one precise meaning; here `songs`, `playlists`, `identity`, `streaming`.],
  [Port / Adapter], [A port is an interface the domain/application defines; an
   adapter is a concrete implementation (DB, filesystem, HTTP).],
  [Hexagonal architecture], [Ports-and-adapters style: business logic in the
   centre, all I/O at the edges behind ports.],
  [Composition root], [The single place where the object graph is assembled and
   concrete adapters are chosen (`container.ts`).],
  [Domain event], [A record that something significant happened in the domain
   (e.g. `SongDeleted`), used to decouple contexts.],
  [ADR], [Architecture Decision Record — a short, immutable document capturing
   one decision, its context and consequences.],
  [arc42], [A template for architecture documentation, 12 sections; this
   document.],
  [Range request / 206], [HTTP mechanism to fetch part of a resource
   (`Range: bytes=...` → `206 Partial Content`); enables audio seeking.],
  [Session cookie], [An opaque identifier in a cookie that maps to a
   server-side session record.],
  [ID3], [Metadata tags embedded in MP3 files (title, artist, album, cover).],
  [MoSCoW], [Prioritisation scheme: Must / Should / Could / Won't.],
  [MinIO], [A self-hostable S3-compatible object storage server, used for local
   dev and tests.],
  [SPA], [Single-Page Application — the Angular frontend.],
)
