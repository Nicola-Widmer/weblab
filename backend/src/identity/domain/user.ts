import { Uuid } from '../../shared/domain/uuid';
import { Email } from './email';

/**
 * A user of the app. Aggregate root of the `identity` context, and a
 * *projection* of the Keycloak user (ADR-0005), not a credential store: `id` is
 * the Keycloak `sub`, `createdAt` is when the backend first saw them, and no
 * password is held here — Keycloak owns authentication.
 */
export class User {
  constructor(
    readonly id: Uuid,
    readonly email: Email,
    readonly createdAt: Date,
    readonly displayName: string | undefined = undefined,
  ) {}

  /**
   * Projection of a Keycloak user, from a validated access token. `id` is the
   * Keycloak `sub`; `firstSeenAt` is preserved across later upserts.
   */
  static fromKeycloak(
    id: Uuid,
    email: string,
    displayName: string | undefined,
    firstSeenAt: Date,
  ): User {
    return new User(id, Email.of(email), firstSeenAt, displayName);
  }
}
