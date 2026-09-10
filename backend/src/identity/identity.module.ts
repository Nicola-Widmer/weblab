import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './application/auth.service';
import { ExpiredSessionSweeper } from './application/expired-session-sweeper';
import { OidcClient } from './application/oidc-client';
import { SessionRepository } from './application/session-repository';
import { TokenVerifier } from './application/token-verifier';
import { UserRepository } from './application/user-repository';
import { assertAuthConfig } from './config';
import { AuthController } from './http/auth.controller';
import { OidcController } from './http/oidc.controller';
import { SessionAuthGuard } from './http/session-auth.guard';
import { DrizzleSessionRepository } from './infrastructure/drizzle-session-repository';
import { DrizzleUserRepository } from './infrastructure/drizzle-user-repository';
import { HttpOidcClient } from './infrastructure/http-oidc-client';
import { JoseTokenVerifier } from './infrastructure/jose-token-verifier';

// Postgres-backed like every other context (ADR-0004). `DATABASE_URL` must be
// set for `AUTH_ENABLED=true`; the repositories inject the `DB` handle and are
// only exercised on an authenticated request.

/** Eager provider: rejects a half-configured `AUTH_ENABLED=true` at startup. */
const AUTH_CONFIG_CHECK = Symbol('AUTH_CONFIG_CHECK');

@Module({
  controllers: [AuthController, OidcController],
  providers: [
    { provide: AUTH_CONFIG_CHECK, useFactory: (): void => assertAuthConfig() },
    AuthService,
    { provide: UserRepository, useClass: DrizzleUserRepository },
    { provide: SessionRepository, useClass: DrizzleSessionRepository },
    { provide: TokenVerifier, useClass: JoseTokenVerifier },
    { provide: OidcClient, useClass: HttpOidcClient },
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    ExpiredSessionSweeper,
  ],
})
export class IdentityModule {}
