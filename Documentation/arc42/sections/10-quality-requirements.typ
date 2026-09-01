#pagebreak(weak: true)

= Quality Requirements

== Quality Tree

- *Usability*
  - Turntable metaphor is legible and responsive (Prio 1)
  - Clear loading / success / error feedback; designed empty states (NFR-1)
  - Keyboard operable, WCAG AA contrast, `prefers-reduced-motion` honoured
- *Performance efficiency*
  - Playback starts without full download; seek latency low on mobile (Prio 2)
  - Song list renders quickly with lazy-loaded cover thumbnails
- *Maintainability*
  - Domain logic unit-testable with no I/O (Prio 3)
  - Bounded contexts independently understandable; adapters swappable
- *Security*
  - Strict per-user data isolation (Prio 4)
  - Safe upload handling; hashed passwords; no secrets in the repo
- *Portability / Operability*
  - `docker compose up` on a clean machine, no manual steps (Prio 5)
  - Storage backend switchable to S3 by configuration only
- *Reliability*
  - Delete leaves no orphaned files or dangling playlist entries

== Quality Scenarios

#table(
  columns: (auto, auto, 1.6fr, 1.1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [ID], [Quality], [Scenario (stimulus → response)], [Measure],
  [Q1], [Performance],
  [User drags the seek bar to a new position on a throttled mobile connection.],
  [Audio resumes from the new position in < 1 s; a single `206` range request,
   no full-file fetch.],
  [Q2], [Security],
  [User A requests `GET /api/songs/{B's id}`.],
  [Always `404`; covered by an integration test for every resource type.],
  [Q3], [Operability],
  [`docker compose up` on a machine with only Docker installed.],
  [App reachable on `:80`, migrations applied, no manual step, within ~60 s.],
  [Q4], [Reliability / Security],
  [Upload of a 25 MB file, or a `.wav` renamed to `.mp3`.],
  [Rejected with `4xx`; no metadata row and no stored object created.],
  [Q5], [Maintainability],
  [A new use case is added to the `playlists` module.],
  [It can be fully unit-tested with fake ports; no PostgreSQL needed for that
   test.],
  [Q6], [Usability],
  [OS "reduce motion" setting is on when a track plays.],
  [The disc does not spin; controls and audio behave normally.],
  [Q7], [Reliability],
  [A song that sits in 3 playlists and is currently playing is deleted.],
  [Row + file removed, all 3 playlists lose the entry with order preserved,
   the player advances or stops.],
)
