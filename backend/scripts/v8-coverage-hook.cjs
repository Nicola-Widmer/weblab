// Preloaded in the E2E coverage run (docker-compose.coverage.yml).
// Node only writes NODE_V8_COVERAGE on a clean exit, but Nest's shutdown hook
// re-raises SIGTERM and kills the process — so flush coverage first.
process.once('SIGTERM', () => require('node:v8').takeCoverage());
