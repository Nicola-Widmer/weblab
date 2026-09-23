// Shared helpers for the arc42 section files.

#import "@preview/merman:0.3.0": mermaid

// Link to an ADR PDF, relative to arc42/architecture.pdf.
#let adrlink(id) = link("../adr/" + id + ".pdf")[#raw(id)]

// Uniform table look.
#let tbl(columns: (auto, 1fr), ..cells) = table(
  columns: columns, inset: 6pt, stroke: 0.4pt + rgb("#cccccc"), ..cells,
)
