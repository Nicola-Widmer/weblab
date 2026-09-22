// Accessibility scan (WCAG2AA) over the Compose stack (`pnpm a11y` — bring
// the stack up first, same as `pnpm e2e`).
//
// pa11y has no option to seed a browser cookie jar directly, so each URL logs
// in for itself through the real Keycloak-hosted form (ADR-0005) via pa11y's
// own action scripting, exactly like a signed-out visitor would.
// `scripts/a11y-session.mjs` separately seeds one song + one playlist over
// the REST API so the list/detail pages have real markup to scan instead of
// empty states, and hands back that playlist's id.
const { execFileSync } = require('node:child_process');

const baseUrl = process.env.E2E_BASE_URL ?? 'https://localhost:8443';

const { playlistId } = JSON.parse(
  execFileSync('node', ['scripts/a11y-session.mjs'], { encoding: 'utf8' }),
);

const username = process.env.A11Y_USERNAME ?? 'dev';
const password = process.env.A11Y_PASSWORD ?? 'dev';

const loginActions = [
  'wait for element #username to be visible',
  `set field #username to ${username}`,
  `set field #password to ${password}`,
  'click element #kc-login',
  'wait for path to be /songs',
];

function page(...extraActions) {
  return {
    url: `${baseUrl}/api/auth/login`,
    actions: [...loginActions, ...extraActions],
  };
}

module.exports = {
  defaults: {
    concurrency: 1,
    standard: 'WCAG2AA',
    timeout: 30000,
    chromeLaunchConfig: {
      args: ['--ignore-certificate-errors'],
    },
  },
  urls: [
    page(),
    page(`navigate to ${baseUrl}/playlists`, 'wait for element h1 to be visible'),
    page(
      `navigate to ${baseUrl}/playlists/${playlistId}`,
      'wait for element h1 to be visible',
    ),
  ],
};
