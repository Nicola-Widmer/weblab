import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Clock } from '../../shared/application/clock';
import { LOCAL_USER_ID } from '../../shared/domain/local-user';
import { asUuid, isUuid } from '../../shared/domain/uuid';
import { readCookie } from '../../shared/http/cookies';
import { IS_PUBLIC_KEY } from '../../shared/http/public.decorator';
import { OidcClient } from '../application/oidc-client';
import { SessionRepository } from '../application/session-repository';
import { authConfig } from '../config';
import type { Session } from '../domain/session';

/**
 * The HTTP edge of ADR-0005. Reads the opaque BFF cookie, loads the server-side
 * session, refreshes the Keycloak access token when it is about to expire, and
 * attaches `{ id }` to the request for `@CurrentUser`. `@Public()` routes are
 * skipped. With `AUTH_ENABLED=false` every request is the fixed local user and
 * no cookie is needed.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionRepository,
    private readonly oidc: OidcClient,
    private readonly clock: Clock,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.isPublic(ctx)) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: unknown }>();

    if (!authConfig().enabled) {
      req.user = { id: LOCAL_USER_ID };
      return true;
    }

    const session = await this.loadValidSession(req);
    req.user = { id: session.userId };
    return true;
  }

  private isPublic(ctx: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? false
    );
  }

  private async loadValidSession(req: Request): Promise<Session> {
    const raw = readCookie(req.headers.cookie, authConfig().cookieName);
    if (!raw || !isUuid(raw)) {
      throw new UnauthorizedException('No session');
    }

    const now = this.clock.now();
    let session = await this.sessions.byId(asUuid(raw));
    if (!session || !session.isValid(now)) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (session.accessTokenExpired(now)) {
      session = await this.refresh(session, now);
    }
    return session;
  }

  private async refresh(session: Session, now: Date): Promise<Session> {
    try {
      const tokens = await this.oidc.refresh(session.refreshToken);
      const refreshed = session.withRefreshedTokens(now, tokens);
      await this.sessions.save(refreshed);
      return refreshed;
    } catch {
      // A parallel request may have refreshed this session already, rotating the
      // refresh token so ours is now spent. Re-read before destroying it — a
      // burst of concurrent requests after an idle period must not log the user
      // out. Only a session still holding an expired access token is truly dead.
      const current = await this.sessions.byId(session.id);
      if (current && current.isValid(now) && !current.accessTokenExpired(now)) {
        return current;
      }
      await this.sessions.deleteById(session.id);
      throw new UnauthorizedException('Session could not be refreshed');
    }
  }
}
