import { Uuid } from '../../shared/domain/uuid';

/**
 * A server-side session (ADR-0005). Its own aggregate — a lifecycle distinct
 * from `User`, deleted on sign-out and revocable independently. `id` is the
 * opaque value carried in the cookie.
 */
export class Session {
  constructor(
    readonly id: Uuid,
    readonly userId: Uuid,
    readonly createdAt: Date,
    readonly expiresAt: Date,
  ) {}

  static issue(
    id: Uuid,
    userId: Uuid,
    now: Date,
    ttlSeconds: number,
  ): Session {
    return new Session(id, userId, now, new Date(now.getTime() + ttlSeconds * 1000));
  }

  isValid(now: Date): boolean {
    return now < this.expiresAt;
  }
}
