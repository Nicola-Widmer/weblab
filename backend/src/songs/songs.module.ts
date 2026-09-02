import { Module } from '@nestjs/common';
import { AudioProbe } from './application/audio-probe';
import { FileStorage } from './application/file-storage';
import { Id3Reader } from './application/id3-reader';
import { SongRepository } from './application/song-repository';
import { SongsService } from './application/songs.service';
import { SongsController } from './http/songs.controller';
import { DrizzleSongRepository } from './infrastructure/drizzle-song-repository';
import { InMemoryFileStorage } from './infrastructure/in-memory-file-storage';
import { LocalFileStorage } from './infrastructure/local-file-storage';
import { StubAudioProbe } from './infrastructure/stub-audio-probe';
import { StubId3Reader } from './infrastructure/stub-id3-reader';

// Filesystem when STORAGE_DRIVER=local (ADR-0004, the docker-compose default),
// in-memory otherwise (tests, `pnpm openapi`). The S3 adapter slots in here too.
const FileStorageImpl =
  process.env.STORAGE_DRIVER === 'local' ? LocalFileStorage : InMemoryFileStorage;

@Module({
  controllers: [SongsController],
  providers: [
    SongsService,
    { provide: SongRepository, useClass: DrizzleSongRepository },
    { provide: FileStorage, useClass: FileStorageImpl },
    { provide: Id3Reader, useClass: StubId3Reader },
    { provide: AudioProbe, useClass: StubAudioProbe },
  ],
})
export class SongsModule {}
