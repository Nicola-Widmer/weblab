import { Module } from '@nestjs/common';
import { AudioProbe } from './application/audio-probe';
import { FileStorage } from './application/file-storage';
import { Id3Reader } from './application/id3-reader';
import { SongRepository } from './application/song-repository';
import { SongsService } from './application/songs.service';
import { SongsController } from './http/songs.controller';
import { DrizzleSongRepository } from './infrastructure/drizzle-song-repository';
import { InMemoryFileStorage } from './infrastructure/in-memory-file-storage';
import { InMemorySongRepository } from './infrastructure/in-memory-song-repository';
import { StubAudioProbe } from './infrastructure/stub-audio-probe';
import { StubId3Reader } from './infrastructure/stub-id3-reader';

// PostgreSQL when `DATABASE_URL` is configured (ADR-0004), in-memory otherwise
// (tests, `pnpm openapi`). This is the only context on Drizzle so far.
const SongRepositoryImpl = process.env.DATABASE_URL
  ? DrizzleSongRepository
  : InMemorySongRepository;

@Module({
  controllers: [SongsController],
  providers: [
    SongsService,
    { provide: SongRepository, useClass: SongRepositoryImpl },
    { provide: FileStorage, useClass: InMemoryFileStorage },
    { provide: Id3Reader, useClass: StubId3Reader },
    { provide: AudioProbe, useClass: StubAudioProbe },
  ],
})
export class SongsModule {}
