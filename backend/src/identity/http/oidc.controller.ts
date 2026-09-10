import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { Clock } from '../../shared/application/clock';
import { asUuid, isUuid } from '../../shared/domain/uuid';
import { readCookie } from '../../shared/http/cookies';
import { Public } from '../../shared/http/public.decorator';
import { AuthService } from '../application/auth.service';
import { OidcClient } from '../application/oidc-client';
import { SessionRepository } from '../application/session-repository';
import { TokenVerifier } from '../application/token-verifier';
import { authConfig } from '../config';
import { Session } from '../domain/session';

const STATE_COOKIE = 'wmp.oidc_state';

/**
 * The BFF endpoints (ADR-0005). The backend is a confidential OIDC client: it
 * runs the authorization-code exchange and keeps the tokens server-side; the
 * browser only ever holds the opaque session cookie.
 */
@Public()
@ApiExcludeController()
@Controller('auth')
export class OidcController {
  constructor(
    private readonly oidc: OidcClient,
    private readonly verifier: TokenVerifier,
    private readonly auth: AuthService,
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * Start login: stash a CSRF `state` and redirect to Keycloak. `?register=1`
   * opens the sign-up form instead (the callback is identical either way).
   */
  @Get('login')
  login(
    @Res() res: Response,
    @Query('register') register?: string,
  ): void {
    const state = randomUUID();
    res.cookie(STATE_COOKIE, state, {
      ...this.baseCookie(),
      maxAge: 10 * 60 * 1000,
    });
    res.redirect(
      this.oidc.authorizeUrl({ state, register: register !== undefined }),
    );
  }

  /** Keycloak redirects here with `?code&state`. Exchange, create session, set cookie. */
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const expected = readCookie(req.headers.cookie, STATE_COOKIE);
    res.clearCookie(STATE_COOKIE, this.baseCookie());
    if (!code || !state || !expected || state !== expected) {
      throw new BadRequestException('Invalid OAuth callback');
    }

    const tokens = await this.oidc.exchangeCode(code);
    const verified = await this.verifier.verify(tokens.accessToken);
    const userId = await this.auth.resolveUser(verified);

    const cfg = authConfig();
    const now = this.clock.now();
    const session = Session.fromTokens(
      asUuid(randomUUID()),
      userId,
      now,
      cfg.sessionTtlSeconds,
      tokens,
    );
    await this.sessions.save(session);

    res.cookie(cfg.cookieName, session.id, {
      ...this.baseCookie(),
      maxAge: cfg.sessionTtlSeconds * 1000,
    });
    res.redirect(cfg.postLoginRedirect);
  }

  /** End the session: revoke at Keycloak, delete the row, clear the cookie. */
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const cfg = authConfig();
    const raw = readCookie(req.headers.cookie, cfg.cookieName);
    if (raw && isUuid(raw)) {
      const session = await this.sessions.byId(asUuid(raw));
      if (session) {
        await this.oidc.endSession(session.refreshToken).catch(() => undefined);
      }
      await this.sessions.deleteById(asUuid(raw));
    }
    res.clearCookie(cfg.cookieName, this.baseCookie());
    res.status(204).send();
  }

  private baseCookie(): CookieOptions {
    return {
      httpOnly: true,
      secure: authConfig().cookieSecure,
      sameSite: 'lax',
      path: '/',
    };
  }
}
