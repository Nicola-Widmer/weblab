import { Uuid } from '../../shared/domain/uuid';
import { Email } from './email';
import { PasswordHash } from './password-hash';

/**
 * A registered user. Aggregate root of the `identity` context.
 *
 * The password is only ever held as a `PasswordHash`; hashing and verification
 * are done by the `PasswordHasher` port in the `SignIn` / `Register` use cases,
 * not here (the domain layer imports no ports — ADR-0002).
 */
export class User {
  constructor(
    readonly id: Uuid,
    readonly email: Email,
    readonly passwordHash: PasswordHash,
    readonly createdAt: Date,
  ) {}

  /** Factory for a brand-new user. Caller has already hashed the password. */
  static register(
    id: Uuid,
    email: Email,
    passwordHash: PasswordHash,
    now: Date,
  ): User {
    return new User(id, email, passwordHash, now);
  }
}
