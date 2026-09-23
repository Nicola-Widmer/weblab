#import "../lib.typ": tbl

#pagebreak(weak: true)

= Glossary

#tbl(
  [Term], [Meaning],
  [Aggregate], [Objects changed as one unit. The root guards the rules.],
  [Value object], [Immutable, compared by value (e.g. `Email`).],
  [Bounded context], [Area with one model: `identity`, `songs`, `playlists`.],
  [Port / adapter], [Interface the core defines / its implementation.],
  [Domain event], [Fact published to other contexts (`SongDeleted`).],
  [BFF], [Backend-for-frontend: the API holds the tokens, the browser a cookie.],
  [OIDC], [Login protocol used with Keycloak.],
  [Range / 206], [Fetch part of a file. Enables seeking.],
  [ID3], [Tags inside an MP3 (title, artist, cover).],
  [ADR], [Architecture Decision Record.],
  [MoSCoW], [Must / Should / Could / Won't.],
)
