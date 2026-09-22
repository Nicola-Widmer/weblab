#import "../lib.typ": adrlink

#pagebreak(weak: true)

= Runtime View

Two scenarios: one that crosses the whole stack, one that stays inside the
frontend and traces how far a single event actually travels
(#link("../../adr/0007-frontend-component-communication.pdf")[ADR-0007]).

== Scenario: play a song from the library

#table(
  columns: (auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Step], [What happens],
  [1], [User clicks a row's play surface in `SongRowComponent` →
   `play.emit(song)`.],
  [2], [`SongListComponent` re-emits `play` unchanged (the one layout hop —
   the row is reused in both the plain and drag-reorderable layouts).],
  [3], [`SongListPanelComponent.play(song)` runs: the display order it was
   given (`rows()`) becomes the playback queue, then
   `PlayerService.play(song, queue)`.],
  [4], [`PlayerService` sets the `<audio>` element's `src` to
   `songAudioUrl(song.id)` (`/api/songs/:id/audio`) and calls `audio.play()`;
   its `play`/`pause`/`timeupdate`/`loadedmetadata` listeners mirror the
   element's real state into signals.],
  [5], [The browser issues a *range-capable* GET for the audio file. nginx
   proxies it to the API with buffering off
   (#adrlink("0003-nginx-serves-frontend")); the API streams the bytes from
   `FileStorage` (#adrlink("0004-metadata-postgres-blob-storage-port")),
   honouring `Range` so `206 Partial Content` responses let the browser seek
   without downloading the whole file.],
  [6], [Every consumer of `PlayerService`'s signals — the sticky bottom bar
   (`PlayerComponent`) and, if open, the expanded drawer
   (`PlayerDrawerComponent`) — re-renders from the same source of truth with
   no event passed between them; neither one owns or forwards playback
   state, both just inject the service.],
)

Note what *doesn't* happen: no component between the row and the panel knows
what "play" means, and nothing downstream of the panel is told to re-emit
anything — the chain in step 1–3 is exactly the two hops
#link("../../adr/0007-frontend-component-communication.pdf")[ADR-0007] caps it
at.

== Scenario: delete a song from a playlist view

Traces the *deepest* event-forwarding chain in the app, end to end, and where
it terminates.

+ `SongMenuComponent` (the `⋯` menu) — user picks "Remove from Playlist" →
  `removeFromPlaylist.emit({ song, entryId })`.
+ `SongRowComponent` re-emits it unchanged (it owns the row's layout, not the
  menu's choices).
+ `SongListComponent` re-emits it unchanged again (it owns *which* rows are
  shown — plain list or drag list — not what a row's menu did).
+ `SongListPanelComponent.removeFromPlaylist(...)` — the chain ends here: a
  `confirm()`, then `playlistsControllerRemoveEntryMutation`, then both the
  playlist-detail query and the playlists-list query are invalidated
  (track counts change) so every screen showing this playlist refetches.

Three re-emitting hops, all unchanged pass-throughs, one owner. Compare to the
*playback* scenario above, where step 6 needed no forwarding at all because
the state that matters to more than one component was never an
input/output chain to begin with — it was a service from the start.

== Scenario: upload and parse a song

#table(
  columns: (auto, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Step], [What happens],
  [1], [User drags an `.mp3` onto `SongUploadComponent`, or picks one via the
   hidden file input; non-`.mp3` files are rejected client-side before any
   request is made.],
  [2], [`songsControllerUploadMutation` posts the file as `multipart/form-data`
   to `POST /api/songs` (session cookie, #adrlink("0005-session-cookie-auth")).],
  [3], [The API reads the ID3 tag (title/artist/album/duration), stores the
   audio via `FileStorage`, and persists the song row scoped to the caller's
   `ownerId`.],
  [4], [On success (or once the whole batch settles), the mutation
   invalidates the songs list query; TanStack Query refetches and every
   subscriber (the songs page, any playlist-detail panel currently open)
   re-renders with the new song — no manual cache surgery in the component.],
)
