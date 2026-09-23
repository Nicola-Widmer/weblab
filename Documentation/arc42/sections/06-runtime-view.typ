#import "../lib.typ": mermaid, adrlink

#pagebreak(weak: true)

= Runtime View

== Play a song

#mermaid(```mermaid
sequenceDiagram
  actor U as User
  participant Row as SongRow
  participant List as SongList
  participant Panel as SongListPanel
  participant PS as PlayerService
  participant N as nginx
  participant API as NestJS API
  participant FS as FileStorage
  U->>Row: click play
  Row->>List: play(song)
  List->>Panel: play(song)
  Panel->>PS: play(song, queue)
  PS->>N: GET /api/songs/{id}/audio (Range)
  N->>API: proxy, no buffering
  API->>FS: getRange(key, range)
  FS-->>API: bytes
  API-->>PS: 206 Partial Content
  Note over PS: bar and drawer re-render from the same signals
```)

`SongList` only forwards the event. `SongListPanel` adds the queue (the rows in
display order), which only it knows. `PlayerService` keeps a copy of that
queue, so opening another page doesn't change what plays next. See
#adrlink("0007-frontend-component-communication") for why rows don't call the
service directly.

== Remove a song from a playlist

The deepest event chain: one emit, two unchanged re-emits, one owner.

#mermaid(```mermaid
sequenceDiagram
  actor U as User
  participant M as SongMenu
  participant R as SongRow
  participant L as SongList
  participant P as SongListPanel
  participant API as API
  U->>M: "Remove from playlist"
  M->>R: removeFromPlaylist
  R->>L: re-emit
  L->>P: re-emit
  P->>API: DELETE /api/playlists/{id}/entries/{entryId}
  API-->>P: 204
  P->>P: invalidate playlist + playlists queries
```)

== Upload a song

#mermaid(```mermaid
sequenceDiagram
  actor U as User
  participant C as SongUpload
  participant API as SongsService
  participant FS as FileStorage
  participant DB as SongRepository
  U->>C: drop .mp3
  C->>API: POST /api/songs (multipart)
  API->>API: check MP3, ≤ 20 MB, read ID3
  API->>FS: put(audio), put(cover)
  API->>DB: save(song)
  API-->>C: 201 song
  C->>C: invalidate songs query
```)

== Delete a song

The response returns before playlists are cleaned up.

#mermaid(```mermaid
sequenceDiagram
  actor U as User
  participant S as SongsService
  participant FS as FileStorage
  participant EB as EventBus
  participant H as RemoveDeletedSongFromPlaylists
  U->>S: DELETE /api/songs/{id}
  S->>S: remove row
  S->>FS: delete audio, cover
  S->>EB: publish SongDeleted
  S-->>U: 204
  EB-)H: SongDeleted (async)
  H->>H: remove song from every playlist
  Note over H: on failure: hourly sweep repairs
```)

== Sign in

#mermaid(```mermaid
sequenceDiagram
  actor U as Browser
  participant API as API
  participant K as Keycloak
  U->>API: GET /api/auth/login
  API-->>U: redirect to Keycloak
  U->>K: login form
  K-->>U: redirect with code
  U->>API: GET /api/auth/callback?code
  API->>K: exchange code for tokens
  API->>API: store tokens in session row
  API-->>U: Set-Cookie session id (HttpOnly)
```)
