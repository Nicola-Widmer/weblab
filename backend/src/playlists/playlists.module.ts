import { Module } from '@nestjs/common';
import { PlaylistReconciliationSweep } from './application/playlist-reconciliation-sweep';
import { PlaylistRepository } from './application/playlist-repository';
import { PlaylistsService } from './application/playlists.service';
import { RemoveDeletedSongFromPlaylists } from './application/remove-deleted-song.handler';
import { PlaylistsController } from './http/playlists.controller';
import { DrizzlePlaylistRepository } from './infrastructure/drizzle-playlist-repository';

@Module({
  controllers: [PlaylistsController],
  providers: [
    PlaylistsService,
    RemoveDeletedSongFromPlaylists,
    PlaylistReconciliationSweep,
    { provide: PlaylistRepository, useClass: DrizzlePlaylistRepository },
  ],
})
export class PlaylistsModule {}
