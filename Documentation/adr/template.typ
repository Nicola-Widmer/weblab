// MADR-style Architecture Decision Record — Typst template.
//
// Usage: create Documentation/adr/NNNN-short-title.typ with, as the very first
// lines:
//
//   #import "template.typ": adr
//   #show: adr.with(
//     "0007",
//     "Short title in the imperative",
//     status: "Accepted",           // Proposed | Accepted | Rejected | Deprecated | Superseded
//     date: "2026-09-01",
//     deciders: "Nicolà Widmer",
//     supersedes: none,             // e.g. "ADR-0003"
//     superseded-by: none,
//   )
//
//   = Context and Problem Statement
//   ...
//
// Recommended section headings (omit what does not apply):
//   Context and Problem Statement · Decision Drivers · Considered Options ·
//   Decision Outcome · Consequences · Pros and Cons of the Options ·
//   More Information

#let status-badge(status) = {
  let palette = (
    "Proposed": rgb("#c26100"),
    "Accepted": rgb("#1a6c2e"),
    "Rejected": rgb("#b3261e"),
    "Deprecated": rgb("#b3261e"),
    "Superseded": rgb("#5a5a5a"),
  )
  let color = palette.at(status, default: rgb("#333333"))
  box(inset: (x: 5pt, y: 2pt), radius: 3pt, fill: color,
    text(fill: white, weight: "bold", size: 8pt, upper(status)))
}

#let adr(
  number,
  title,
  status: "Accepted",
  date: none,
  deciders: "Nicolà Widmer",
  supersedes: none,
  superseded-by: none,
  body,
) = {
  set document(title: "ADR-" + number + " \u{2014} " + title)
  set page(paper: "a4", numbering: "1", margin: 2cm)
  set text(font: "New Computer Modern", size: 10pt, lang: "en")
  set par(justify: true, leading: 0.6em)
  set heading(numbering: none)

  show heading.where(level: 1): it => block(above: 1.1em, below: 0.45em,
    text(size: 12pt, weight: "bold", it))
  show heading.where(level: 2): it => block(above: 0.8em, below: 0.3em,
    text(size: 10.5pt, weight: "bold", it))
  show raw.where(block: true): it => block(
    fill: rgb("#f4f4f4"), inset: 8pt, radius: 3pt, width: 100%,
    text(size: 8.5pt, it),
  )

  let meta = ()
  if date != none { meta.push("Date: " + date) }
  meta.push("Deciders: " + deciders)
  if supersedes != none { meta.push("Supersedes: " + supersedes) }
  if superseded-by != none { meta.push("Superseded by: " + superseded-by) }

  block(width: 100%)[
    #text(size: 16pt, weight: "bold")[ADR-#number — #title]
    #v(0.35em)
    #status-badge(status)
    #h(0.6em)
    #text(size: 9pt, fill: rgb("#555555"), meta.join("  ·  "))
  ]
  line(length: 100%, stroke: 0.5pt + rgb("#cccccc"))
  v(0.5em)

  body
}
