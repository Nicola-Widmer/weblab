import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Clock } from '../../shared/application/clock';
import { SessionRepository } from './session-repository';

/**
 * Hourly sweep of sessions past their hard `expiresAt` (ADR-0005). Access-token
 * expiry is handled per-request by the guard; this only clears rows the guard
 * would reject anyway, so they do not accumulate for the life of the deployment.
 */
@Injectable()
export class ExpiredSessionSweeper {
  private readonly log = new Logger(ExpiredSessionSweeper.name);

  constructor(
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweep(): Promise<void> {
    try {
      await this.sessions.deleteExpired(this.clock.now());
    } catch (err) {
      this.log.warn(`expired-session sweep failed: ${String(err)}`);
    }
  }
}
