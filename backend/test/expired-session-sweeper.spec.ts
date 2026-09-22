import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ExpiredSessionSweeper } from '../src/identity/application/expired-session-sweeper';
import { Session } from '../src/identity/domain/session';
import { FakeSessionRepository } from './fakes';
import { asUuid } from '../src/shared/domain/uuid';

const USER = asUuid('67bacbe7-c2d2-4922-b506-582df6956f66');
const NOW = new Date('2026-09-08T12:00:00.000Z');
const tokens = { accessToken: 'a', refreshToken: 'r', expiresInSeconds: 300 };

describe('ExpiredSessionSweeper', () => {
  it('deletes sessions past expiry and keeps the rest', async () => {
    const sessions = new FakeSessionRepository();
    const stale = Session.fromTokens(
      asUuid('aaaaaaaa-0000-4000-8000-000000000001'),
      USER,
      new Date(NOW.getTime() - 2 * 3600_000), // expired an hour ago
      3600,
      tokens,
    );
    const live = Session.fromTokens(
      asUuid('bbbbbbbb-0000-4000-8000-000000000002'),
      USER,
      NOW,
      3600,
      tokens,
    );
    await sessions.save(stale);
    await sessions.save(live);

    const sweeper = new ExpiredSessionSweeper(sessions, { now: () => NOW });
    await sweeper.sweep();

    expect(await sessions.byId(stale.id)).toBeUndefined();
    expect(await sessions.byId(live.id)).toBeDefined();
  });
});
