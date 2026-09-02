// Flat config. The only thing enforced here is the architecture from ADR-0002:
// bounded contexts stay isolated, and the dependency rule points inward
// (domain <- application <- http/infrastructure). Everything else is left to
// the compiler and review.
import tseslint from 'typescript-eslint';

const CONTEXTS = ['identity', 'songs', 'playlists'];

/** Importing another context by name — the shortcut ADR-0002 says to resist. */
const crossContext = {
  group: CONTEXTS.flatMap((c) => [`**/${c}`, `**/${c}/**`]),
  message:
    'Cross-context import. Contexts communicate only through domain events in src/shared/contracts.',
};

/** Inner layers must not reach out to adapters or the HTTP edge. */
const noOuterLayers = {
  group: [
    '**/infrastructure',
    '**/infrastructure/**',
    '**/http',
    '**/http/**',
  ],
  message:
    'The dependency rule points inward: depend on a port, not on an adapter or the HTTP edge.',
};

/** domain/ is pure: no framework, no I/O, no other layer. */
const noFramework = {
  group: [
    '@nestjs/**',
    'class-validator',
    'class-transformer',
    'drizzle-orm',
    'drizzle-orm/**',
    '**/application',
    '**/application/**',
  ],
  message: 'domain/ must stay free of framework, I/O and other layers.',
};

const restrict = (patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
});

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'drizzle/**', 'openapi.json'] },
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tseslint.parser },
  },
  // The globs below are disjoint, so each file gets exactly one
  // `no-restricted-imports` config (a later block would replace, not merge).
  {
    files: ['src/*/domain/**/*.ts'],
    rules: restrict([crossContext, noOuterLayers, noFramework]),
  },
  {
    files: ['src/*/application/**/*.ts'],
    rules: restrict([crossContext, noOuterLayers]),
  },
  {
    files: ['src/*/http/**/*.ts', 'src/*/infrastructure/**/*.ts', 'src/*/*.ts'],
    ignores: ['src/shared/**'],
    rules: restrict([crossContext]),
  },
  {
    files: ['src/shared/**/*.ts'],
    rules: restrict([crossContext]),
  },
);
