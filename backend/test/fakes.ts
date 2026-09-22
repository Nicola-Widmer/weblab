import { SessionRepository } from '../src/identity/application/session-repository';
import { UserRepository } from '../src/identity/application/user-repository';
import type { Session } from '../src/identity/domain/session';
import type { User } from '../src/identity/domain/user';
import type { Uuid } from '../src/shared/domain/uuid';

/** In-memory `UserRepository` for unit tests (the app uses Drizzle/Postgres). */
export class FakeUserRepository extends UserRepository {
  private readonly users = new Map<Uuid, User>();

  save(user: User): Promise<void> {
    this.users.set(user.id, user);
    return Promise.resolve();
  }

  byId(id: Uuid): Promise<User | undefined> {
    return Promise.resolve(this.users.get(id));
  }
}

/** In-memory `SessionRepository` for unit tests. */
export class FakeSessionRepository extends SessionRepository {
  private readonly sessions = new Map<Uuid, Session>();

  save(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
    return Promise.resolve();
  }

  byId(id: Uuid): Promise<Session | undefined> {
    return Promise.resolve(this.sessions.get(id));
  }

  deleteById(id: Uuid): Promise<void> {
    this.sessions.delete(id);
    return Promise.resolve();
  }

  deleteExpired(now: Date): Promise<void> {
    for (const [id, session] of this.sessions) {
      if (!session.isValid(now)) this.sessions.delete(id);
    }
    return Promise.resolve();
  }
}
