#import "../lib.typ": mermaid, tbl

#pagebreak(weak: true)

= Quality Requirements

#mermaid(```mermaid
flowchart LR
  Q["Quality"] --> US["Usability"]
  Q --> PE["Performance"]
  Q --> MA["Maintainability"]
  Q --> SE["Security"]
  Q --> OP["Operability"]
  Q --> RE["Reliability"]
  US --> Q6["Q6 reduced motion"]
  PE --> Q1["Q1 fast seek"]
  MA --> Q5["Q5 unit-testable"]
  SE --> Q2["Q2 isolation"]
  SE --> Q4["Q4 bad upload"]
  OP --> Q3["Q3 one command"]
  RE --> Q7["Q7 clean delete"]
```)

#tbl(columns: (auto, 1fr, 1fr),
  [ID], [Scenario], [Expected],
  [Q1], [User seeks on a slow mobile connection.], [Plays from new position in
   < 1 s with one `206` request.],
  [Q2], [User A requests B's song.], [`404`.],
  [Q3], [`docker compose up` on a machine with only Docker.], [App on `:8443`,
   migrations applied, no manual step.],
  [Q4], [Upload of a 25 MB file or a non-MP3.], [`400`; nothing stored.],
  [Q5], [New `playlists` use case.], [Unit-testable with fake ports.],
  [Q6], [OS "reduce motion" is on.], [Disc does not spin; audio works.],
  [Q7], [Delete a playing song that is in 3 playlists.], [Row and file gone,
   entries removed, player advances.],
)
