import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlaylistRepository } from './playlist-repository';

/**
 * Hourly backstop for a `SongDeleted` reaction that failed or was dropped
 * (ADR-0002, fire-and-forget has no automatic retry): removes playlist entries
 * whose song no longer exists.
 */
@Injectable()
export class PlaylistReconciliationSweep {
  private readonly log = new Logger(PlaylistReconciliationSweep.name);

  constructor(private readonly playlists: PlaylistRepository) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweep(): Promise<void> {
    try {
      await this.playlists.removeOrphanedEntries();
    } catch (err) {
      this.log.warn(`playlist reconciliation sweep failed: ${String(err)}`);
    }
  }
}
