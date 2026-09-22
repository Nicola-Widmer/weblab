#!/usr/bin/env node
// Logs in as the seeded "dev" user (real Keycloak form, ADR-0005) — over the
// REST API, distinct from the browser-driven login pa11y itself performs via
// `.pa11yci.cjs`'s actions — and makes sure at least one song and one
// playlist containing it exist, so the a11y scan sees populated list/detail
// markup instead of empty states. Prints `{ playlistId }` as JSON on stdout.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Self-signed cert on the Compose `web` origin (frontend/nginx.conf) — same
// tradeoff `playwright.config.ts` makes with `ignoreHTTPSErrors`.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseURL = process.env.E2E_BASE_URL ?? 'https://localhost:8443';
const FIXTURE_MP3 = path.join(__dirname, '..', 'e2e', 'fixtures', 'test-silence.mp3');

async function login() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.goto(`${baseURL}/api/auth/login`);
  await page.locator('#username').waitFor();
  await page.locator('#username').fill(process.env.A11Y_USERNAME ?? 'dev');
  await page.locator('#password').fill(process.env.A11Y_PASSWORD ?? 'dev');
  await page.locator('#kc-login').click();
  await page.waitForURL(`${baseURL}/`);
  const cookies = await context.cookies();
  await browser.close();

  const session = cookies.find((c) => c.name === 'wmp.sid');
  if (!session) throw new Error('login did not yield a wmp.sid session cookie');
  return session;
}

function api(cookie, requestPath, init) {
  return fetch(`${baseURL}${requestPath}`, {
    ...init,
    headers: { ...init?.headers, Cookie: `${cookie.name}=${cookie.value}` },
  });
}

async function ensureSong(cookie) {
  const songs = await api(cookie, '/api/songs').then((r) => r.json());
  if (songs.length > 0) return songs[0].id;

  const bytes = await readFile(FIXTURE_MP3);
  const form = new FormData();
  form.set('file', new Blob([bytes], { type: 'audio/mpeg' }), 'a11y-fixture.mp3');
  const res = await api(cookie, '/api/songs', { method: 'POST', body: form });
  if (!res.ok) throw new Error(`song fixture upload failed: ${res.status}`);
  return (await res.json()).id;
}

async function ensurePlaylist(cookie, songId) {
  const playlists = await api(cookie, '/api/playlists').then((r) => r.json());
  const existing = playlists.find((p) => p.name === 'A11y Fixture');
  const playlist =
    existing ??
    (await api(cookie, '/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A11y Fixture' }),
    }).then((r) => r.json()));

  const detail = await api(cookie, `/api/playlists/${playlist.id}`).then((r) => r.json());
  if (!detail.entries.some((e) => e.songId === songId)) {
    await api(cookie, `/api/playlists/${playlist.id}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId }),
    });
  }
  return playlist.id;
}

const cookie = await login();
const songId = await ensureSong(cookie);
const playlistId = await ensurePlaylist(cookie, songId);
process.stdout.write(JSON.stringify({ playlistId }));
