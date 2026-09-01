#pagebreak(weak: true)

= Introduction and Goals

A web-based music player. Users upload MP3 files, organise them into playlists,
and play them back on a screen styled as a record player: a vinyl disc that spins
while a track plays and a tone-arm that drops on play and lifts on pause. The two
self-defined CRUD resources are *Songs* and *Playlists*. The full functional
scope and its MoSCoW prioritisation live in `Proposal.typ`; this document
describes *how* the system is built and *why*.

== Quality Goals

#table(
  columns: (auto, 1fr, 2fr),
  inset: 6pt,
  align: (center + horizon, left + horizon, left + horizon),
  stroke: 0.4pt + rgb("#cccccc"),
  [Prio], [Quality goal], [Motivation],
  [1], [Turntable-like experience],
  [The playback screen must *feel* like a real turntable — disc spin and
   tone-arm motion — while still honouring `prefers-reduced-motion`.],
  [2], [Smooth audio streaming & seeking],
  [Playback starts without downloading the whole file; seeking works on mobile.
   Requires HTTP Range (`206 Partial Content`) end to end.],
  [3], [Testability & maintainability],
  [Domain logic isolated from Express/PostgreSQL so a use case is unit-testable
   with no I/O; a clear test pyramid (Jest / Supertest / Playwright).],
  [4], [Per-user data privacy],
  [A user only ever sees or changes their own songs and playlists; enforced
   server-side, not just in the UI.],
  [5], [One-command operation],
  [`docker compose up` brings the whole system up on a clean machine with no
   manual steps and no cloud account.],
)

== Stakeholders

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  align: (left + horizon, left + horizon),
  stroke: 0.4pt + rgb("#cccccc"),
  [Role], [Expectations towards the architecture],
  [Developer / student (Nicolà Widmer)],
  [A structure to build within the time box; guardrails that keep decisions
   consistent; fast feedback from tests.],
  [Assessor / lecturer (HSLU)],
  [Lab requirements met (≥ 2 self-defined CRUD resources, automated tests,
   Docker packaging); architecture and decisions documented.],
  [End user / self-hoster],
  [Reliable upload and playback, a private library, a simple setup.],
  [Future maintainer],
  [Understandable module boundaries and ADRs that explain the "why".],
)
