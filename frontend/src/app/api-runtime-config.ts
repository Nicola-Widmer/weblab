import type { CreateClientConfig } from './api/client.gen';

/**
 * Runtime configuration for the generated HeyApi fetch client.
 * `baseUrl: '/api'` — the SPA and API share one origin behind nginx (ADR-0003).
 * `credentials: 'include'` — carry the first-party session cookie (ADR-0005).
 */
export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: '/api',
  credentials: 'include',
});
