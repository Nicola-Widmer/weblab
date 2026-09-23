#import "../lib.typ": tbl

#pagebreak(weak: true)

= Introduction and Goals

A web music player. Users upload MP3s, group them into playlists and play them
on a record-player screen (spinning disc, moving tone-arm). The CRUD resources
are *Songs* and *Playlists*. Scope and user stories: `Proposal.typ`.

== Quality Goals

#tbl(columns: (auto, auto, 1fr),
  [Prio], [Goal], [Meaning],
  [1], [Turntable feel], [Disc spins, tone-arm moves. Respects
   `prefers-reduced-motion`.],
  [2], [Streaming & seeking], [Playback starts before the file is downloaded.
   HTTP Range (`206`) end to end.],
  [3], [Testability], [Domain logic runs in unit tests without a database.],
  [4], [Privacy], [Users only see their own data. Enforced on the server.],
  [5], [One-command start], [`docker compose up` on a clean machine.],
)

== Stakeholders

#tbl(
  [Role], [Expects],
  [Developer (Nicolà Widmer)], [Clear structure, fast tests.],
  [Lecturer (HSLU)], [≥ 2 CRUD resources, tests, Docker, documented decisions.],
  [End user], [Reliable upload and playback, private library.],
)
