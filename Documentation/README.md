# Documentation

| File | Purpose |
| --- | --- |
| `Proposal.typ` | Project proposal, user stories, MoSCoW scope. **What** is built. |
| `arc42/architecture.typ` | Entry point for the arc42 doc (v8): preamble, title page, outline, `#include`s of each section. Compile **this**. |
| `arc42/sections/NN-*.typ` | One file per arc42 section (1–12). Pure content fragments. |
| `arc42/lib.typ` | Shared Typst helpers used by the section files. |
| `adr/NNNN-*.typ` | Architecture Decision Records (MADR style). **Why** each significant choice was made. Immutable once accepted. |
| `adr/template.typ` | Template + instructions for new ADRs. |

## How these relate

`arc42/architecture.typ` is the umbrella. Its **section 9** lists the decisions
and links to the ADRs. Don't grow one giant ADR — add a new numbered file per
decision and reference it from section 9.

## Decision log

| ADR | Decision | Status |
| --- | --- | --- |
| 0001 | Single repository, single deployable monolith | Accepted |
| 0002 | DDD tactical patterns + hexagonal layering, module per bounded context | Accepted |
| 0003 | Dedicated nginx container serves the SPA and reverse-proxies `/api` | Accepted |
| 0004 | PostgreSQL for metadata; audio bytes behind a `FileStorage` port (local FS default, S3 optional) | Accepted |
| 0005 | Server-side session-cookie auth; ownership enforced inside use cases | Accepted |

## Building the PDFs

```bash
typst compile arc42/architecture.typ
typst compile adr/0003-nginx-serves-frontend.typ
```

The arc42 section files under `arc42/sections/` are fragments — compile
`arc42/architecture.typ`, not the individual sections. To add a section, create
the file and add one `#include` line to `architecture.typ`.

Requires the `New Computer Modern` font (bundled with a normal Typst install).
