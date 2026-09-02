
#set document(title: "Web Music Player — Proposal & User Stories", author: "Nicolà Widmer")
#set page(numbering: "1", margin: 1.6cm)
#set text(font: "New Computer Modern", size: 9.5pt, lang: "en")
#set par(justify: true, leading: 0.55em)
#set heading(numbering: "1.1")

#show heading.where(level: 1): it => block(above: 0.9em, below: 0.5em, text(size: 13pt, weight: "bold", it))
#show heading.where(level: 2): it => block(above: 0.7em, below: 0.35em, text(size: 10.5pt, weight: "bold", it))

#let moscow(kind) = {
  let color = (
    "Must": rgb("#b3261e"), "Should": rgb("#c26100"),
    "Could": rgb("#1a6c2e"), "Won't": rgb("#5a5a5a"),
  ).at(kind)
  box(inset: (x: 4pt, y: 1pt), radius: 2pt, fill: color,
    text(fill: white, weight: "bold", size: 7pt, kind))
}

#let story(id, priority, title, role, goal, benefit, criteria) = {
  block(above: 0.7em, below: 0.5em, breakable: false)[
    #text(weight: "bold")[#id — #title] #h(0.4em) #moscow(priority) \
    _As a_ #role, _I want_ #goal, _so that_ #benefit. #h(0.3em)
    #text(size: 8.5pt, fill: rgb("#3a3a3a"))[#criteria.join([ · ])]
  ]
}

#align(center)[
  #text(size: 20pt, weight: "bold")[Web Music Player]
  #v(0.2em)
  #text(size: 13pt)[Project Proposal & User Stories]
  #v(0.4em)
  #text(size: 10pt, fill: rgb("#555"))[HSLU · Web Programming Lab · #datetime.today().display("[year]-[month]-[day]")]
]

#v(1.2em)

= Introduction

A web-based music player. Users upload MP3 files, organise them into playlists,
and play them back on a screen styled as a record player — a vinyl disc that
spins while a track plays and a tone-arm that drops on play and lifts on pause.
The two self-defined CRUD resources are *Songs* and *Playlists*.

= Tech stack

#table(columns: (auto, 1fr), inset: 6pt, align: (left + horizon, left + horizon),
  stroke: 0.4pt + rgb("#cccccc"),
  table.header([*Concern*], [*Choice*]),
  [Frontend], [Angular, Tailwind CSS, TypeScript, HeyApi],
  [Backend], [NestJS (REST), Drizzle],
  [Database], [PostgreSQL — song/playlist metadata],
  [Audio storage], [Server filesystem (mounted volume); DB holds the path, optionally S3-compatible object storage (MinIO, AWS S3, ...)],
  [Tests], [Jest (unit), Supertest + real PostgreSQL (integration), Playwright (E2E)],
  [Packaging], [Docker Compose — `docker compose up`],
)

= Committed stories

== Songs

#story("SNG-1", "Must", "Manage songs (CRUD)", "user",
  "to upload, browse, edit and delete songs", "I control my own library",
  (
    [*Create* — upload `.mp3` only (MIME + extension), files over 20 MB rejected; ID3 tags (title, artist, album, duration, cover art) pre-fill the record, a missing title falls back to the filename; the file lands on the uploads volume with a metadata row in PostgreSQL.],
    [*Read* — a sortable list shows title, artist, album, duration and date added (sortable by title, artist, date); cover thumbnails have fixed dimensions and lazy-load; empty state links to upload.],
    [*Update* — title, artist and album are editable; title is required, duration is read-only; the audio file is never modified.],
    [*Delete* — requires confirmation; removes the DB row, the file on disk and the song from every playlist; if the song is playing, playback advances or stops.],
  ))

#story("SNG-2", "Must", "Play a song in the record-player view", "user",
  "to play a song in the record-player view", "listening feels like a real turntable",
  (
    [Vinyl disc with the cover art as its label, plus a tone-arm; the disc spins only while playing and the tone-arm lifts on pause.],
    [Always-visible controls: play/pause, previous, next, seek bar, current / total time.],
    [`prefers-reduced-motion` disables the spin animation.],
    [Audio is served with HTTP Range support so seeking works on mobile.],
  ))

#story("SNG-3", "Could", "Store MP3 files in S3-compatible object storage", "operator",
  "uploaded MP3 files to live in an S3-compatible bucket instead of the local volume",
  "the app can run on more than one node and survive container restarts without a shared disk",
  (
    [The storage backend is chosen by configuration — local filesystem or an S3-compatible bucket (AWS S3, MinIO, ...); the default stays local so `docker compose up` needs no cloud account.],
    [Upload writes the object to the bucket; playback streams it back with HTTP Range support (presigned URL or proxied through the API); delete removes the object with no orphans left behind.],
    [The S3 path is covered by integration tests running against a local MinIO container.],
  ))

== Playlists

#story("PL-1", "Must", "Manage playlists (CRUD)", "user",
  "to create, edit and delete playlists and their songs", "I can organise songs into sets",
  (
    [*Create* — name required, duplicate names allowed; the playlist appears in the overview immediately, empty.],
    [*Read* — the overview lists each playlist with its track count; opening one shows its ordered songs; empty states for "no playlists" and "empty playlist".],
    [*Update* — rename with the same name rules; add songs from the song list or playlist view (a song may sit in several playlists, appended to the end); remove songs (affects only this playlist, remaining order preserved). Changes are reflected in every view; removing the playing song advances playback.],
    [*Delete* — requires confirmation; the songs stay in the library; playback stops if that playlist is playing.],
  ))

#story("PL-2", "Must", "Play a playlist with auto-advance", "user",
  "to play a playlist and have it advance automatically",
  "I can listen without touching the device",
  (
    [Opens the record-player view on the first or selected track; the next track starts automatically when one ends.],
    [Previous / next move within the playlist; playing a single library song behaves as a playlist of one.],
  ))

#story("PL-3", "Should", "Reorder songs in a playlist", "user",
  "to change the order of songs in a playlist", "the playlist flows the way I want",
  ([Drag-and-drop on desktop, a touch control on mobile; the new order persists and drives auto-advance.],))

== Playback

#story("PB-1", "Must", "Seek within a track", "user",
  "to jump to any position in the current track", "I can skip or replay a part",
  ([Click or drag the seek bar to set the position; the current-time display follows; works on mobile.],))

#story("PB-2", "Should", "Repeat mode", "user",
  "to toggle repeat between off, all and one", "I can loop a playlist or a track",
  ([Repeat-all wraps past the last track; repeat-one restarts the current track; the mode is shown and persists across reload.],))

#story("PB-3", "Should", "Volume control", "user",
  "to set playback volume in the app", "I don't need OS controls",
  ([A 0–100% slider plus a mute toggle that remembers the previous level; persists across reload.],))

#story("PB-4", "Should", "Resume after reload", "user",
  "the app to remember what I was playing after a reload", "a refresh doesn't lose my place",
  ([Restores the current playlist, track and position, paused.],))

== Authentication

#story("AUTH-1", "Should", "Register and sign in", "visitor",
  "to register with email and password and sign in", "my library is private to me",
  (
    [Email validated for format and uniqueness; minimum password length; passwords stored only as bcrypt hashes.],
    [A session cookie is set on sign-in and cleared on sign-out. No email verification or password reset (known limitation).],
  ))

#story("AUTH-2", "Should", "Per-user data", "user",
  "my songs and playlists to be visible only to me", "other users can't see or change my data",
  (
    [Every song and playlist belongs to a user; all endpoints filter by the authenticated user; other users' resources return 403/404.],
    [With auth disabled, one implicit local user owns everything.],
  ))

== Usability

#story("NFR-1", "Should", "Feedback, empty states and accessibility basics", "user",
  "clear feedback and keyboard support throughout", "the app is pleasant for everyone",
  (
    [Async actions show loading plus a success or error result; every list has a designed empty state.],
    [Primary flows are keyboard-operable with visible focus; images have alt text; contrast meets WCAG AA.],
  ))