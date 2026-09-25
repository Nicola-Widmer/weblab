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
  PE --> Q8["Q8 Lighthouse ≥ 90"]
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
  [Q4], [Upload of a 25 MB file, a non-MP3, or a non-MP3 renamed to `.mp3`.], [`400`; nothing stored.],
  [Q5], [New `playlists` use case.], [Unit-testable with fake ports.],
  [Q6], [OS "reduce motion" is on.], [Disc does not spin; audio works.],
  [Q7], [Delete a playing song that is in 3 playlists.], [Row and file gone,
   entries removed, player advances.],
  [Q8], [Signed-in user opens the prod build (`docker compose up`, `:8443`);
   Lighthouse 12, mobile and desktop presets.], [Performance, Accessibility,
   Best Practices and SEO each ≥ 90.],
)

#figure(
  stack(dir: ttb, spacing: 0.5em,
    image("../images/lighthouse-mobile.png", width: 100%),
    image("../images/lighthouse-desktop.png", width: 100%),
  ),
  caption: [Q8 evidence: Lighthouse 12.8 on `/songs`, mobile (top: 94/95/100/100)
   and desktop (bottom: 100/96/100/100), measured 23.09.2026.],
)
