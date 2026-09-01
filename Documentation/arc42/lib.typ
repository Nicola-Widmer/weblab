// Shared helpers for the arc42 architecture document.
// Imported by the section files under sections/.

// Link to an ADR PDF, rendered relative to the compiled architecture.pdf
// (which lives in Documentation/arc42/).
#let adrlink(id) = link("../adr/" + id + ".pdf")[#raw(id)]
