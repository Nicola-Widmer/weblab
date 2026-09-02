#set page(paper: "a4")
#set heading(numbering: "1.")

#show link: set text(fill: blue, weight: 700)
#show link: underline

= Work Journal

#let entries = (
  (date: "31.08.2026", time: 1.5, comments: "Project Proposal & User Stories"),
  (date: "01.09.2026", time: 3, comments: "Architecture, Project Setup"),
  (date: "02.09.2026", time: 0, comments: "Domain Model, Boilerplate, DTOs, OpenAPI spec with generated HTTP Client"),
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