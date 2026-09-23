#import "../lib.typ": tbl

#pagebreak(weak: true)

= Risks and Technical Debt

#tbl(columns: (auto, 1fr, 1fr),
  [Area], [Problem], [Status],
  [E2E / a11y isolation], [Tests share one user and one database. A failed
   test can leave data behind.], [Tests run serially and clean up. Fine for one
   developer.],
  [Event-chain depth], [The two-re-emit rule (ADR-0007) is not linted.],
  [Checked in review.],
  [pa11y login], [Each scanned URL logs in again.], [Fine for 3 URLs.],
  [Bundle size], [Initial bundle over Angular's 1 MB warning.], [Low priority:
   self-hosted.],
  [S3 storage], [Adapter not built; only local filesystem.], [Optional (Could).],
)
