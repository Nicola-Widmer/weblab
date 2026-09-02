import { Module } from '@nestjs/common';
import { FileStorage } from './application/file-storage';
import { Id3Reader } from './application/id3-reader';
import { SongRepository } from './application/song-repository';
import { SongsService } from './application/songs.service';
import { SongsController } from './http/songs.controller';
import { DrizzleSongRepository } from './infrastructure/drizzle-song-repository';
import { LocalFileStorage } from './infrastructure/local-file-storage';
import { MusicMetadataId3Reader } from './infrastructure/music-metadata-id3-reader';

// Filesystem when STORAGE_DRIVER=local (ADR-0004, the docker-compose default),
// in-memory otherwise (tests, `pnpm openapi`). The S3 adapter slots in here too.

@Module({
  controllers: [SongsController],
  providers: [
    SongsService,
    { provide: SongRepository, useClass: DrizzleSongRepository },
    { provide: FileStorage, useClass: LocalFileStorage },
    { provide: Id3Reader, useClass: MusicMetadataId3Reader },
  ],
})
export class SongsModule {}
