import { defineConfig } from '@hey-api/openapi-ts';

/**
 * Generates the typed API layer in `src/app/api/` from the backend's committed
 * OpenAPI document (the single source of truth — see ADR-0006).
 *
 * Run `pnpm generate:api` after the backend schemas change. The output is
 * committed so `ng build` and CI don't need a running backend; CI regenerates
 * and `git diff --exit-code`s it.
 */
export default defineConfig({
  input: '../backend/openapi.json',
  output: {
    path: 'src/app/api',
  },
  postProcess: ['prettier'],
  plugins: [
    {
      name: '@hey-api/client-fetch',
      // Same-origin behind the nginx proxy (ADR-0003); send the session cookie.
      runtimeConfigPath: './src/app/api-runtime-config',
    },
    '@hey-api/schemas',
    '@hey-api/sdk',
    {
      name: '@tanstack/angular-query-experimental',
      // Emit injectable query/mutation option factories.
    },
  ],
});
