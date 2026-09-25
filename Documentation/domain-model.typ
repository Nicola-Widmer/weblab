// Domain model. Compile: typst compile domain-model.typ
// Diagrams are Mermaid, rendered by @preview/merman.

#set document(title: "Web Music Player — Domain Model", author: "Nicolà Widmer")
#set page(paper: "a4", numbering: "1", margin: 2cm)
#set text(font: "New Computer Modern", size: 10pt, lang: "en")
#set par(justify: true, leading: 0.58em)
#set heading(numbering: "1.1")
#show table.cell.where(y: 0): strong

#import "@preview/merman:0.3.0": mermaid

#let adr(id) = link("adr/" + id + ".pdf")[#raw(id)]
#let tbl(columns: (auto, 1fr), ..cells) = table(
  columns: columns, inset: 6pt, stroke: 0.4pt + rgb("#cccccc"), ..cells,
)

#align(center)[
  #text(size: 22pt, weight: "bold")[Web Music Player]
  #v(0.3em)
  #text(size: 13pt)[Domain Model]
  #v(0.3em)
  #text(size: 9pt, fill: rgb("#666"))[Nicolà Widmer · HSLU · Web Programming Lab]
]
#v(1em)
#outline(depth: 1)

= Contexts

Three bounded contexts, one NestJS module each (#adr("0002-ddd-hexagonal-backend")).
Contexts reference each other *by id only*.

#mermaid(```mermaid
flowchart LR
  subgraph shared["shared"]
    UID["Uuid"]
    SDC["SongDeleted"]
  end
  subgraph identity
    USR["User"]
    SES["Session"]
  end
  subgraph songs
    SNG["Song"]
  end
  subgraph playlists
    PLT["Playlist"]
  end
  identity -->|"user id"| songs
  identity -->|"user id"| playlists
  songs -.->|"SongDeleted (async)"| playlists
  songs <--> FS[("FileStorage")]
```)

#tbl(
  [Context], [Owns],
  [`identity`], [Local copy of Keycloak users, login sessions. Stories AUTH-1/2.],
  [`songs`], [Upload, metadata, audio + cover files, range streaming. SNG-1–3,
   PB-1.],
  [`playlists`], [Ordered song lists; a song may appear twice. PL-1–3.],
)

Playback state (current track, position, volume) is client state in the
Angular `PlayerService`, not a backend context.

= Aggregates

#mermaid(```mermaid
classDiagram
  direction LR
  class User {
    <<aggregate root>>
    id: Uuid
    email: Email
    displayName?: string
    createdAt: Date
    fromKeycloak()$
  }
  class Session {
    <<aggregate root>>
    id: Uuid
    userId: Uuid
    expiresAt: Date
    accessToken, refreshToken
    isValid(now)
    accessTokenExpired(now)
    withRefreshedTokens()
  }
  class Song {
    <<aggregate root>>
    id: Uuid
    ownerId: Uuid
    title: string
    artist?: string
    album?: string
    duration: int
    addedAt: Date
    upload()$
    editMetadata()
  }
  class AudioRef {
    <<value object>>
    storageKey
    sizeBytes
    contentType
  }
  class CoverArtRef {
    <<value object>>
    storageKey
    sizeBytes
    contentType
  }
  class Playlist {
    <<aggregate root>>
    id: Uuid
    ownerId: Uuid
    name: string
    create()$
    rename()
    addSong()
    removeEntry()
    reorder()
  }
  class PlaylistEntry {
    <<entity>>
    id: Uuid
    songId: Uuid
    position: int
  }
  User "1" --> "0..*" Session
  Song *-- "1" AudioRef
  Song *-- "0..1" CoverArtRef
  Playlist *-- "0..*" PlaylistEntry
  PlaylistEntry ..> Song : songId
  Song ..> User : ownerId
  Playlist ..> User : ownerId
```)

Dashed arrows are id references across contexts.

= Rules

#tbl(columns: (auto, 1fr),
  [Aggregate], [Invariants],
  [`User`], [`id` is the Keycloak `sub`. `Email` is trimmed, lower-case, valid. No password stored —
   Keycloak owns credentials.],
  [`Session`], [`id` is the cookie value. Invalid after `expiresAt`. Access token refreshed 5 s before it
   expires. Tokens never leave the server.],
  [`Song`], [`title` not empty (falls back to the filename). `duration`,
   `audio`, `coverArt` never change. Upload must be `audio/mpeg`, `.mp3`,
   ≤ 20 MB, start with MP3 magic bytes (`ID3` tag or MPEG frame sync), with a
   readable duration.],
  [`Playlist`], [`name` not empty (duplicates allowed). `position` is always
   `0…n-1`. `reorder` must be a permutation of the current entries. The same
   `songId` may repeat — each occurrence has its own entry id.],
)

= Ports

#tbl(
  [Port], [Methods],
  [`UserRepository`], [`save`, `byId`],
  [`SessionRepository`], [`save`, `byId`, `deleteById`, `deleteExpired`],
  [`TokenVerifier`], [`verify(accessToken)` — JWKS, `iss`, `aud`, expiry],
  [`OidcClient`], [`authorizeUrl`, `exchangeCode`, `refresh`, `endSession`],
  [`SongRepository`], [`save`, `byId(id, ownerId)`, `listByOwner(ownerId, sort)`,
   `remove`],
  [`FileStorage`], [`put`, `getRange`, `delete`, `stat`
   (#adr("0004-metadata-postgres-blob-storage-port"))],
  [`Id3Reader`], [`read(bytes)`],
  [`PlaylistRepository`], [`save`, `byId(id, ownerId)`, `listByOwner`, `remove`,
   `removeSongEverywhere`, `removeOrphanedEntries`],
  [`Clock`, `IdGenerator`], [shared],
)

= Domain Event

`SongDeleted(songId, ownerId)` is the only event between contexts.

#mermaid(```mermaid
sequenceDiagram
  participant S as songs: SongsService.remove
  participant EB as EventBus
  participant H as playlists: RemoveDeletedSongFromPlaylists
  participant SW as playlists: hourly sweep
  S->>S: delete row, audio, cover
  S->>EB: publish SongDeleted
  EB-)H: SongDeleted (after the response)
  H->>H: removeSongEverywhere(songId)
  Note over H: may fail — no retry
  SW->>SW: removeOrphanedEntries()
```)

= Code Layout

`backend/src/<context>/` with `domain/`, `application/`, `infrastructure/`,
`http/` and `<context>.module.ts`. An ESLint rule blocks imports between
contexts; shared types live in `backend/src/shared/`.
