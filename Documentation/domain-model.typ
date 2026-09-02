// Domain model for the Web Music Player.
// Standalone Typst document — compile:  typst compile domain-model.typ
//
// Diagrams are authored in Mermaid and rendered to SVG at compile time by the
// `@preview/merman` package (a bundled WASM build — the first compile downloads
// the package; no Node needed after that). Each block must be valid Mermaid:
// `#mermaid(```mermaid … ```)`. Pass a raw block, not a plain string — Mermaid
// node labels contain `"` which would close a Typst string early.
//
// Scope note: this is the *model* (WHAT the domain is). WHY the boundaries and
// the event bus look this way is ADR-0002; storage is ADR-0004; auth is
// ADR-0005. The functional scope is Proposal.typ.

#set document(title: "Web Music Player — Domain Model", author: "Nicolà Widmer")
#set page(paper: "a4", numbering: "1", margin: 2cm)
#set text(font: "New Computer Modern", size: 10pt, lang: "en")
#set par(justify: true, leading: 0.58em)
#set heading(numbering: "1.1")

#import "@preview/merman:0.3.0": mermaid

#show heading.where(level: 1): it => block(above: 1.3em, below: 0.6em,
  text(size: 14pt, weight: "bold", it))
#show heading.where(level: 2): it => block(above: 0.9em, below: 0.4em,
  text(size: 11pt, weight: "bold", it))
#show heading.where(level: 3): it => block(above: 0.7em, below: 0.25em,
  text(size: 10pt, weight: "bold", style: "italic", it))
#show raw.where(block: true): it => block(
  fill: rgb("#f4f4f4"), inset: 8pt, radius: 3pt, width: 100%,
  text(size: 7.5pt, it),
)
#show table.cell.where(y: 0): strong

#let adr(id) = link("adr/" + id + ".pdf")[#raw(id)]

#align(center)[
  #v(1.4cm)
  #text(size: 22pt, weight: "bold")[Web Music Player]
  #v(0.35em)
  #text(size: 13pt)[Domain Model]
  #v(0.3em)
  #text(size: 9pt, fill: rgb("#666"))[
    Nicolà Widmer · HSLU · Web Programming Lab ·
    #datetime.today().display("[year]-[month]-[day]")
  ]
]
#v(1.2em)

#outline(depth: 2, indent: auto)
#pagebreak()

= Purpose and Scope

This document is the reference for the backend's domain layer: the bounded
contexts, their aggregates, the value objects and invariants each aggregate
guards, the ports the application layer depends on, and the one domain event
that crosses a context boundary.

Three server-side bounded contexts, each a feature-folder Nest module
(#adr("0002-ddd-hexagonal-backend")):

#table(
  columns: (auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Context], [Responsibility],
  [`identity`], [Registration, sign-in, server-side sessions; the source of the
   authenticated user's id. Stories AUTH-1, AUTH-2.],
  [`songs`], [The music library: MP3 upload with validation and ID3 extraction,
   metadata CRUD, the audio- and cover-file lifecycle, and HTTP range
   streaming. Stories SNG-1, SNG-2, SNG-3, PB-1.],
  [`playlists`], [Named, ordered lists of songs; a song may appear more than
   once. Stories PL-1, PL-2, PL-3.],
)

The proposal's glossary names a fourth context, `streaming`. It has no aggregate
and no domain state — playback session state (current track, position, repeat,
volume, resume) is *client* state in the Angular `player/` feature, persisted to
`localStorage` (#adr("0006-openapi-typed-client-tanstack-query")). Byte delivery
with HTTP `Range` is therefore folded into `songs` as an application service, not
a separate module.

Cross-context references are *by identity only*: a `Playlist` holds song ids
(`Uuid`), never `Song` objects; `songs` and `playlists` hold the owner's id,
never a `User`.

= Context Map

#mermaid(```mermaid
  flowchart TB
  subgraph shared["shared kernel (src/shared)"]
    UID["Uuid (VO)"]
    DEB["DomainEvent (base)"]
    SDC["SongDeleted (contract)"]
  end
  subgraph identity["identity"]
    USR["User (AR)"]
    SES["Session (AR)"]
  end
  subgraph songs["songs"]
    SNG["Song (AR)"]
  end
  subgraph playlists["playlists"]
    PLT["Playlist (AR)"]
  end
  FS[("FileStorage: audio + cover objects")]
  identity -->|"issues the user id (Uuid)"| songs
  identity -->|"issues the user id (Uuid)"| playlists
  songs -->|"SongDeleted (async, fire-and-forget)"| playlists
  songs <-->|"put / getRange / delete"| FS
```)

`SongDeleted` is the *entire* server-side cross-context surface. Every other
"X changed, view Y updates" in the proposal — a rename showing everywhere, a
reorder driving auto-advance, the playing song being removed — is the frontend
refetching, not a domain event.

= Shared Kernel — `src/shared/`

#table(
  columns: (auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Item], [Role],
  [`Uuid` (VO)], [Validated v4 UUID. The type of every entity id and every
   cross-aggregate reference (`ownerId`, `songId`, `entryId`); minted by the
   `IdGenerator` port.],
  [`DomainEvent` (base)], [Marker + `occurredAt` for everything on the bus.],
  [`contracts/SongDeleted`], [The one published cross-context event. Extends
   `DomainEvent`; carries only ids.],
  [`Clock`, `IdGenerator`], [Port interfaces reused by more than one context.],
)

= identity

Upstream of everything; depends on no other context. Stories AUTH-1, AUTH-2.

== Aggregate `User` (root)

#table(
  columns: (auto, auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Field], [Type], [Notes],
  [`id`], [`Uuid`], [],
  [`email`], [`Email` (VO)], [Normalised lower-case, format-valid. Uniqueness is
   a context rule checked by the `Register` use case, not by the aggregate.],
  [`passwordHash`], [`PasswordHash` (VO)], [bcrypt output only. Plaintext is
   never stored and never held on the aggregate.],
  [`createdAt`], [`Date`], [],
)

- *Invariants:* valid `Email`; only a bcrypt hash is stored; minimum password
  length is enforced before hashing.
- *Behaviour:* `User.register(email, plaintext, hasher)` (factory) ·
  `verifyPassword(plaintext, hasher): boolean`.

== Aggregate `Session` (root)

Its own aggregate — a lifecycle distinct from `User`, revoked independently
(#adr("0005-session-cookie-auth")).

#table(
  columns: (auto, auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Field], [Type], [Notes],
  [`id`], [`Uuid`], [Opaque v4 UUID; this is the cookie value.],
  [`userId`], [`Uuid`], [],
  [`createdAt` / `expiresAt`], [`Date`], [],
)

- *Behaviour:* `Session.issue(userId, clock, ttl)` · `isValid(now): boolean`.
  Sign-out deletes the record.

== Value objects, ports, use cases

#table(
  columns: (auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Value objects], [`Email` (normalise + validate) · `PasswordHash` (wraps the
   bcrypt string; never mixed with plaintext). The plaintext password is a plain
   `string`, min-length checked at the DTO; ids are the shared `Uuid` (§3).],
  [Ports], [`UserRepository` (`save`, `byId`, `byEmail`, `existsByEmail`) ·
   `SessionRepository` (`save`, `byId`, `deleteById`, `deleteExpired`) ·
   `PasswordHasher` · `Clock` · `TokenGenerator`],
  [Use cases], [`Register` · `SignIn` (verify → `Session.issue` → return token) ·
   `SignOut` · `AuthenticateRequest(token) → Uuid` (the HTTP guard; with
   `AUTH_ENABLED=false` returns the fixed local user id and skips the cookie)],
  [Events], [None required.],
)

= songs

Owns the audio *and* cover file lifecycle and range streaming. Stories SNG-1,
SNG-2, SNG-3, PB-1; quality goal 2.

== Aggregate `Song` (root)

#table(
  columns: (auto, auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Field], [Type], [Notes],
  [`id`], [`Uuid`], [],
  [`ownerId`], [`Uuid`], [Every repository query is owner-scoped
   (#adr("0005-session-cookie-auth")).],
  [`title`], [`string`], [Required, non-empty (checked in the factory and the
   DTO). At creation, falls back to the filename when ID3 has no title.],
  [`artist` / `album`], [`string?`], [Optional. Editable.],
  [`duration`], [`int` (seconds)], [From ID3 or the decoder. *Read-only after
   creation.*],
  [`audio`], [`AudioRef` (VO)], [Bundles `{ storageKey, sizeBytes, contentType =
   "audio/mpeg" }` — three fields, not a string. *Immutable* — SNG-1: "the audio
   file is never modified".],
  [`coverArt`], [`CoverArtRef?` (VO)], [Bundles `{ storageKey, contentType,
   sizeBytes }`; a *separate* `FileStorage` / S3 object, not a database blob
   (#adr("0004-metadata-postgres-blob-storage-port")).],
  [`addedAt`], [`Date`], [],
)

- *Invariants:* `title` non-empty; `duration` and `audio` immutable; the upload
  is MP3 (MIME *and* extension) and at most 20 MB.
- *Behaviour:* `Song.upload({ ownerId, id3, audioRef, coverRef? })` (factory —
  applies the title fallback, copies artist / album / duration from ID3) ·
  `editMetadata({ title, artist, album })` (title still required; duration,
  audio and cover untouched). No `delete` method — deletion is orchestrated by
  the use case.

== Value objects

`AudioRef` · `CoverArtRef` (each bundles a storage key + size + content type) ·
`Mp3Upload` (transient: `filename`, bytes, declared MIME; `isValidMp3()`,
`withinSizeLimit()`) · `Id3Tags` (transient: parsed
`title? / artist? / album? / durationSeconds? / coverBytes?`).

`title`, `artist`, `album` are plain `string`s and `duration` a plain `int` —
their only rule (`title` non-empty) lives in the factory and the DTO, not in a
wrapper type.

== Ports

#table(
  columns: (auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [`SongRepository`], [`save` · `byId(id, ownerId)` ·
   `listByOwner(ownerId, sort ∈ {title, artist, dateAdded})` · `remove(id)`],
  [`FileStorage`], [`put(key, stream, sizeBytes, contentType)` ·
   `getRange(key, range?) → { stream, contentLength, totalSize, contentType }` ·
   `delete(key)` · `stat(key)`. Local-FS default, S3 optional
   (#adr("0004-metadata-postgres-blob-storage-port")). Handles both the audio
   object and the cover object.],
  [`Id3Reader`], [`read(bytes) → Id3Tags`],
  [`AudioProbe`], [`duration(bytes) → seconds` — fallback when ID3 has none.],
  [`Clock`, `IdGenerator`], [],
)

== Use cases

- `UploadSong` — validate → read ID3 → `put` the audio under a new opaque key →
  if a cover is present, `put` it under a second key → `Song.upload` → `save`.
- `ListSongs(ownerId, sort)` · `GetSong(ownerId, id)` · `EditSongMetadata`.
- `DeleteSong` — owner-scoped load → `SongRepository.remove` →
  `FileStorage.delete(audio.storageKey)` →
  `FileStorage.delete(coverArt.storageKey)` if any → publish `SongDeleted`.
  Ordered per #adr("0004-metadata-postgres-blob-storage-port"); a failed object
  delete leaves an orphan for the reconciliation sweep.
- `StreamSongAudio(ownerId, songId, rangeHeader)` — owner-scoped resolve →
  parse `Range` → `FileStorage.getRange` → stream with `Content-Range`,
  `Accept-Ranges: bytes`, `Content-Length`, status `206` / `200`; another
  owner's song → 403 / 404.
- `GetSongCover(ownerId, songId)` — owner-scoped → `FileStorage.getRange` →
  `200` (cacheable), or `404` when there is no cover.

== Events and HTTP surface

#table(
  columns: (auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Publishes], [`SongDeleted(songId, ownerId, at)` — the only one.],
  [HTTP], [`GET /api/songs` · `GET /api/songs/:id` · `POST /api/songs`
   (multipart) · `PATCH /api/songs/:id` · `DELETE /api/songs/:id` ·
   `GET /api/songs/:id/audio` (Range) · `GET /api/songs/:id/cover`],
)

= playlists

Named, ordered lists. *A song may appear more than once*, so each entry carries
its own local identity. Stories PL-1, PL-2, PL-3.

== Aggregate `Playlist` (root)

#table(
  columns: (auto, auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Field], [Type], [Notes],
  [`id`], [`Uuid`], [],
  [`ownerId`], [`Uuid`], [],
  [`name`], [`string`], [Required, non-empty (checked in the factory and the
   DTO). Duplicates *are* allowed across a user's playlists.],
  [`entries`], [`PlaylistEntry[]`], [Ordered; local entities (below).],
  [`createdAt`], [`Date`], [],
)

=== Entity `PlaylistEntry` (inside the aggregate)

#table(
  columns: (auto, auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Field], [Type], [Notes],
  [`entryId`], [`Uuid`], [Local identity; what add / remove / reorder address.
   Unique within the playlist (a v4 UUID is globally unique anyway).],
  [`songId`], [`Uuid`], [By value. *May repeat* across entries.],
  [`position`], [`int`], [Maintained contiguous `0 … n-1`.],
)

- *Invariants (guarded by the root):* `name` non-empty; `entryId` unique within
  the playlist; `position` values contiguous and unique; a `reorder` argument is
  a permutation of the current `entryId` set. *No* uniqueness on `songId`.
- *Behaviour:*
  - `Playlist.create(ownerId, name)`
  - `rename(name)`
  - `addSong(songId)` — always appends a *new* `PlaylistEntry` with a fresh
    `entryId` at the end, even when that `songId` is already present.
  - `removeEntry(entryId)` — removes that one occurrence, re-packs `position`
    (PL-1: "affects only this playlist, remaining order preserved").
  - `removeAllOccurrences(songId)` — drops every entry with that `songId`;
    used *only* by the `SongDeleted` handler.
  - `reorder(orderedEntryIds)` — permutation check, re-packs `position` (PL-3).
- The aggregate does *not* verify that a `songId` points at a real `Song` — that
  is a cross-context fact. A stale id (song deleted between the UI listing it and
  the add) is cleaned by `SongDeleted` plus the reconciliation sweep.

== Value objects, ports, use cases

#table(
  columns: (auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Value objects], [None. `name` is a plain `string`; ids are the shared `Uuid`
   (§3).],
  [Ports], [`PlaylistRepository` — `save` · `byId(id, ownerId)` ·
   `listByOwner(ownerId)` · `remove(id)` · `containingSong(songId)` (*not*
   owner-scoped: it serves the system event, not a user request)],
  [Use cases], [`CreatePlaylist` · `ListPlaylists` (name + track count) ·
   `GetPlaylist` (ordered `[{ entryId, songId, position }]`) · `RenamePlaylist` ·
   `AddSongToPlaylist(ownerId, playlistId, songId)` ·
   `RemovePlaylistEntry(ownerId, playlistId, entryId)` ·
   `ReorderPlaylist(ownerId, playlistId, orderedEntryIds)` · `DeletePlaylist`
   (the songs stay in the library) · *handler*
   `RemoveDeletedSongFromPlaylists(SongDeleted)` → for each
   `containingSong(songId)`: `removeAllOccurrences(songId)` + `save`],
  [Events], [None published server-side.],
  [HTTP], [`GET /api/playlists` · `POST /api/playlists` ·
   `GET /api/playlists/:id` · `PATCH /api/playlists/:id` (rename) ·
   `DELETE /api/playlists/:id` · `POST /api/playlists/:id/entries` `{ songId }` ·
   `DELETE /api/playlists/:id/entries/:entryId` ·
   `PUT /api/playlists/:id/entries` `{ entryIds: [...] }` (reorder)],
)

= Aggregates at a Glance

#mermaid(```mermaid
classDiagram
  class User {
    <<aggregate root>>
    +id: Uuid
    +email: Email
    +passwordHash: PasswordHash
    +createdAt: Date
    +register(email, plaintext, hasher) User$
    +verifyPassword(plaintext, hasher) bool
  }
  class Session {
    <<aggregate root>>
    +id: Uuid
    +userId: Uuid
    +createdAt: Date
    +expiresAt: Date
    +issue(userId, clock, ttl) Session$
    +isValid(now) bool
  }
  class Song {
    <<aggregate root>>
    +id: Uuid
    +ownerId: Uuid
    +title: string
    +artist: string
    +album: string
    +duration: int
    +audio: AudioRef
    +coverArt: CoverArtRef
    +addedAt: Date
    +upload(ownerId, id3, audioRef, coverRef) Song$
    +editMetadata(title, artist, album)
  }
  class AudioRef {
    <<value object>>
    +storageKey: string
    +sizeBytes: int
    +contentType: string
  }
  class CoverArtRef {
    <<value object>>
    +storageKey: string
    +contentType: string
    +sizeBytes: int
  }
  class Playlist {
    <<aggregate root>>
    +id: Uuid
    +ownerId: Uuid
    +name: string
    +createdAt: Date
    +create(ownerId, name) Playlist$
    +rename(name)
    +addSong(songId) Uuid
    +removeEntry(entryId)
    +removeAllOccurrences(songId)
    +reorder(orderedEntryIds)
  }
  class PlaylistEntry {
    <<entity>>
    +id: Uuid
    +songId: Uuid
    +position: int
  }
  User "1" --> "0..*" Session : issues
  Song *-- "1" AudioRef : audio
  Song *-- "0..1" CoverArtRef : coverArt
  Playlist *-- "0..*" PlaylistEntry : ordered entries
  PlaylistEntry ..> Song : songId (by id, may repeat)
  Song ..> User : ownerId (by id)
  Playlist ..> User : ownerId (by id)
```)

`artist`, `album` and `coverArt` are optional. Dashed arrows (`..>`) are
id-only references that cross a context boundary — no object graph, no import.

= Domain Events

#mermaid(```mermaid
sequenceDiagram
  actor U as User (browser)
  participant DS as songs: DeleteSong
  participant SR as SongRepository
  participant FS as FileStorage
  participant EB as EventBus
  participant H as playlists: RemoveDeletedSongFromPlaylists
  participant PR as PlaylistRepository

  U->>DS: DELETE /api/songs/{id}
  DS->>SR: remove(id)
  DS->>FS: delete(audio.storageKey)
  DS->>FS: delete(coverArt.storageKey) [if any]
  DS->>EB: publish(SongDeleted)
  DS-->>U: 204 No Content
  Note over EB,H: after the response — async, fire-and-forget
  EB-)H: SongDeleted
  H->>PR: containingSong(songId)
  PR-->>H: matching playlists
  loop each playlist
    H->>PR: save(playlist, entries dropped)
  end
  Note over H: handler failure -> reconciliation sweep, no retry
```)

#table(
  columns: (auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Event], [`SongDeleted(songId, ownerId, at)`],
  [Publisher], [`songs` · `DeleteSong`],
  [Subscribers], [`playlists` · `RemoveDeletedSongFromPlaylists`; the frontend
   player (advance / stop the current track)],
  [Transport], [async, fire-and-forget, in-process
   (#adr("0002-ddd-hexagonal-backend"))],
)

= Invariants

#table(
  columns: (auto, auto, 1fr, auto),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Context], [Aggregate], [Key invariants], [Enforced by],
  [identity], [`User`], [valid `Email`; only a bcrypt hash stored; minimum
   password length], [`User.register` + `Register` (email uniqueness)],
  [identity], [`Session`], [opaque UUID id; expiry respected; deletable],
  [`Session.issue` / `isValid`; `SignOut`],
  [songs], [`Song`], [`title` non-empty; `duration` + `audio` immutable;
   MP3-only, ≤ 20 MB], [`UploadSong` (file rules) + `Song.upload` /
   `editMetadata`],
  [playlists], [`Playlist`], [`name` non-empty (duplicates allowed); `entryId`
   unique in-playlist; `position` contiguous; reorder = permutation of
   `entryId`s; `songId` may repeat], [`Playlist` root methods; owner scope in
   the use cases],
  [songs (streaming)], [—], [stateless; owner-scoped range reads],
  [`StreamSongAudio`],
)

= Confirmed Design Decisions

#table(
  columns: (auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Decision], [Rationale],
  [`streaming` folded into `songs`], [No aggregate, no domain state; one
   developer should not maintain a projection plus sync handlers for a
   byte-serving endpoint. The glossary's fourth context is a `songs` HTTP
   concern.],
  [`Session` is its own aggregate], [Lifecycle distinct from `User`; revoked
   independently.],
  [One `Uuid` type for every id], [Entity ids and cross-aggregate references are
   all v4 UUIDs through one shared value object, not per-aggregate branded types
   (`SongId`, `PlaylistId`, …). Less ceremony; the id's shape stays explicit.],
  [Value objects only where they earn it], [`Email`, `PasswordHash`, `AudioRef`,
   `CoverArtRef` — they normalise, validate a format, or bundle several fields.
   `title`, `artist`, `album`, playlist `name`, `duration` are plain `string` /
   `int`; the one rule (non-empty) sits in the aggregate factory and the DTO
   (#adr("0006-openapi-typed-client-tanstack-query")).],
  [A song may appear many times in one playlist], [`PlaylistEntry` gets a local
   `entryId`; add / remove / reorder address entries, not `songId`s.
   `removeAllOccurrences` exists only for the `SongDeleted` reaction.],
  [`playlists` accepts `songId`s optimistically], [No cross-context existence
   check. A dangling entry is cleaned by `SongDeleted` + the reconciliation
   sweep — consistent with the eventually-consistent event posture.],
  [Cover art is a separate `FileStorage` / S3 object], [Keeps PostgreSQL and its
   backups small (#adr("0004-metadata-postgres-blob-storage-port")); `delete`
   removes the audio object *and* the cover object.],
  [No server-side playback session], [PB-2 / PB-3 / PB-4 persistence is
   `localStorage` in the Angular `player/` feature
   (#adr("0006-openapi-typed-client-tanstack-query")); cross-device resume is
   out of scope (arc42 §3).],
)

= Mapping to Code

One feature folder per context under `backend/src/`, each split
`domain/` · `application/` · `infrastructure/` · `http/` + `<context>.module.ts`
(#adr("0002-ddd-hexagonal-backend")). Aggregates and value objects are plain
classes in `domain/`; ports are `abstract class` DI tokens in `application/`
bound to `infrastructure/` adapters in the module; use cases are `@Injectable()`
services in `application/`; event handlers are `@EventsHandler` classes in the
subscribing context's `application/`. The `eslint.config.mjs` boundary rule
fails the build on a cross-context import or an inward-pointing violation.
