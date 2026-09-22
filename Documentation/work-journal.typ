#set page(paper: "a4")
#set heading(numbering: "1.")

#show link: set text(fill: blue, weight: 700)
#show link: underline

= Work Journal

#let entries = (
  (date: "31.08.2026", time: 1.5, comments: "Project Proposal & User Stories"),
  (date: "01.09.2026", time: 3, comments: "Architecture, Project Setup"),
  (date: "02.09.2026", time: 4, comments: "Domain Model, Boilerplate, DTOs, OpenAPI spec with generated HTTP Client"),
  (date: "02.09.2026", time: 4, comments: "Frontend API, Local File Storage, ID3 Reader, Simple Frontend"),
  (date: "03.09.2026", time: 7, comments: "Song/Playlist View, Song Streaming"),
  (date: "04.09.2026", time: 8, comments: "Auth Slice"),
  (date: "05.09.2026", time: 7, comments: "Vinyl Player, Mobile and Animation Performance Improvements, Song Reordering"),
  (date: "06.09.2026", time: 5, comments: "Song Delete via CQRS, Skeleton Loaders"),
  (date: "21.09.2026", time: 3, comments: "Refactoring, Accessibilty Improvements"),
  (date: "22.09.2026", time: 3, comments: "Pagespeed/Lighthouse"),
  (date: "", time: 0, comments: ""),
)

#let total = entries.map(e => e.time).sum()

#table(
  columns: (auto, auto, auto),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [*Date*], [*Time Spent*], [*Comments*],
  ..entries.map(e => ([#e.date], [#e.time h], [#e.comments])).flatten(),
  table.cell(colspan: 2)[*Total*], [*#total h*]
)