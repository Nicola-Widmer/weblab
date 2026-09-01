// Entry point for the arc42 architecture documentation.
// Compile this file:  typst compile arc42/architecture.typ
// Section content lives in sections/; shared helpers in lib.typ.

#set document(
  title: "Web Music Player — Architecture Documentation",
  author: "Nicolà Widmer",
)
#set page(paper: "a4", numbering: "1", margin: 2cm)
#set text(font: "New Computer Modern", size: 10pt, lang: "en")
#set par(justify: true, leading: 0.58em)
#set heading(numbering: "1.1")

#show heading.where(level: 1): it => block(above: 1.3em, below: 0.6em,
  text(size: 14pt, weight: "bold", it))
#show heading.where(level: 2): it => block(above: 0.9em, below: 0.4em,
  text(size: 11pt, weight: "bold", it))
#show heading.where(level: 3): it => block(above: 0.7em, below: 0.25em,
  text(size: 10pt, weight: "bold", style: "italic", it))
#show raw.where(block: true): it => block(
  fill: rgb("#f4f4f4"), inset: 8pt, radius: 3pt, width: 100%,
  text(size: 8pt, it),
)
#show table.cell.where(y: 0): strong

// ── Title page ──────────────────────────────────────────────────────────────
#align(center)[
  #v(3cm)
  #text(size: 24pt, weight: "bold")[Web Music Player]
  #v(0.4em)
  #text(size: 14pt)[Architecture Documentation]
  #v(0.2em)
  #text(size: 9.5pt, fill: rgb("#666"))[structured after the arc42 template (v8)]
  #v(2.5em)
  #text(size: 10pt)[Nicolà Widmer · HSLU · Web Programming Lab]
  #v(0.2em)
  #text(size: 10pt, fill: rgb("#666"))[#datetime.today().display("[year]-[month]-[day]")]
]
#pagebreak()

#outline(depth: 2, indent: auto)

// ── Sections (arc42 v8) ─────────────────────────────────────────────────────
#include "sections/01-introduction-and-goals.typ"
#include "sections/02-constraints.typ"
#include "sections/03-context-and-scope.typ"
#include "sections/04-solution-strategy.typ"
#include "sections/05-building-block-view.typ"
#include "sections/06-runtime-view.typ"
#include "sections/07-deployment-view.typ"
#include "sections/08-crosscutting-concepts.typ"
#include "sections/09-architecture-decisions.typ"
#include "sections/10-quality-requirements.typ"
#include "sections/11-risks-and-technical-debt.typ"
#include "sections/12-glossary.typ"
