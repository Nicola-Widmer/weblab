#pagebreak(weak: true)

= Risks and Technical Debt

#table(
  columns: (auto, 1fr, 1fr),
  inset: 6pt, stroke: 0.4pt + rgb("#cccccc"),
  [Area], [Risk / debt], [Mitigation / status],
  [E2E & a11y test isolation],
  [`pnpm e2e` and `pnpm a11y` both run against the real Compose stack with one
   seeded user and one shared Postgres — there is no per-test tenant or
   database reset. A spec that fails before its own cleanup step leaves
   orphaned rows (a song, a playlist) that later runs will see but ignore
   (they select by a fresh unique title, not by absence of prior data).],
  [Specs run serially (`workers: 1`) so they don't race each other's uploads;
   each spec deletes what it created. Acceptable for a one-developer project;
   would need per-run tenant isolation (a fresh Keycloak user + DB schema per
   CI run) to scale to parallel CI.],
  [Event-forwarding depth],
  [The two-hop cap (#link("../../adr/0007-frontend-component-communication.pdf")[ADR-0007])
   is a review convention, not an enforced lint rule — nothing stops a chain
   from quietly growing past it as new wrapper components are added.],
  [No tooling yet. A custom ESLint rule (max depth of `(x)="x.emit($event)"`
   re-emission per event name) would catch it mechanically; not built —
   revisit if a real three-hop chain appears in review.],
  [`.pa11yci.cjs` re-authenticates per URL],
  [Each of the 3 scanned URLs logs in through the real Keycloak form from
   scratch (pa11y has no cookie-jar option — see
   #link("08-crosscutting-concepts.typ")[§8]), adding a few seconds per URL
   and one more Keycloak session per run.],
  [Acceptable at the current scan scope (3 URLs). Would need a shared-profile
   or CDP-cookie-injection approach to stay fast if the URL list grows
   significantly.],
  [Frontend bundle budget],
  [The production build already exceeds the default Angular initial-bundle
   budget (about 1.39 MB vs. a 1 MB warning threshold).],
  [Not yet addressed — no route-level code-splitting beyond what the Angular
   CLI does by default. Low priority: local/self-hosted deployment, not a
   CDN-served public app (#link("03-context-and-scope.typ")[§3]).],
)
