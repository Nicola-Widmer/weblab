import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Clock } from '../../shared/application/clock';
import { Uuid } from '../../shared/domain/uuid';
import { User } from '../domain/user';
import type { VerifiedToken } from './token-verifier';
import { UserRepository } from './user-repository';

/**
 * Use cases of the `identity` context. Authentication is delegated to Keycloak
 * (ADR-0005): `resolveUser` turns a validated access token into the local user,
 * `userById` reads that user back for `GET /auth/me`.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * Resolve a validated Keycloak token to the local user id, upserting the
   * projection row (id = `sub`) so its email and display name track Keycloak
   * while `createdAt` keeps the first-seen time. The HTTP edge calls this after
   * `TokenVerifier.verify`.
   */
  async resolveUser(token: VerifiedToken): Promise<Uuid> {
    if (!token.email) {
      throw new UnauthorizedException('Access token has no email claim');
    }
    const existing = await this.users.byId(token.subject);
    const user = User.fromKeycloak(
      token.subject,
      token.email,
      token.name,
      existing?.createdAt ?? this.clock.now(),
    );
    await this.users.save(user);
    return user.id;
  }

  async userById(id: Uuid): Promise<User> {
    const user = await this.users.byId(id);
    if (!user) throw new UnauthorizedException('Unknown user');
    return user;
  }
}
