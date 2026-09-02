import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Clock } from '../../shared/application/clock';
import { IdGenerator } from '../../shared/application/id-generator';
import { SongDeleted } from '../../shared/contracts/song-deleted.event';
import { Uuid } from '../../shared/domain/uuid';
import { AudioRef } from '../domain/audio-ref';
import { CoverArtRef } from '../domain/cover-art-ref';
import { Song } from '../domain/song';
import { FileStorage, type ByteRange, type RangeResult } from './file-storage';
import { Id3Reader } from './id3-reader';
import { SongRepository, type SongSort } from './song-repository';

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export interface UploadedFile {
  filename: string;
  mimeType: string;
  bytes: Buffer;
}

/** A byte stream from `FileStorage` plus the MIME type the HTTP edge serves it as. */
export type StreamedFile = RangeResult & { contentType: string };

/** Use cases of the `songs` context, including the range-streaming edge. */
@Injectable()
export class SongsService {
  constructor(
    private readonly songs: SongRepository,
    private readonly files: FileStorage,
    private readonly id3: Id3Reader,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly events: EventBus,
  ) {}

  list(ownerId: Uuid, sort: SongSort): Promise<Song[]> {
    return this.songs.listByOwner(ownerId, sort);
  }

  async get(ownerId: Uuid, id: Uuid): Promise<Song> {
    const song = await this.songs.byId(id, ownerId);
    if (!song) throw new NotFoundException('Song not found');
    return song;
  }

  async upload(ownerId: Uuid, file: UploadedFile): Promise<Song> {
    if (file.mimeType !== 'audio/mpeg' || !file.filename.toLowerCase().endsWith('.mp3')) {
      throw new BadRequestException('Only .mp3 uploads are accepted');
    }
    if (file.bytes.length > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('File exceeds the 20 MB limit');
    }

    const tags = await this.id3.read(file.bytes);
    if (tags.durationSeconds === undefined) {
      throw new BadRequestException(
        'Could not read the audio — is this a valid MP3?',
      );
    }

    const audioKey = this.ids.next();
    await this.files.put(audioKey, file.bytes, 'audio/mpeg');
    const audio = new AudioRef(audioKey, file.bytes.length, 'audio/mpeg');

    let cover: CoverArtRef | undefined;
    if (tags.coverBytes) {
      const coverType = tags.coverMimeType ?? 'image/jpeg';
      const coverKey = this.ids.next();
      await this.files.put(coverKey, tags.coverBytes, coverType);
      cover = new CoverArtRef(coverKey, coverType, tags.coverBytes.length);
    }

    const song = Song.upload({
      id: this.ids.next(),
      ownerId,
      filename: file.filename,
      id3: tags,
      durationSeconds: tags.durationSeconds,
      audio,
      cover,
      now: this.clock.now(),
    });
    await this.songs.save(song);
    return song;
  }

  async editMetadata(
    ownerId: Uuid,
    id: Uuid,
    patch: { title: string; artist?: string; album?: string },
  ): Promise<Song> {
    const song = await this.get(ownerId, id);
    song.editMetadata(patch);
    await this.songs.save(song);
    return song;
  }

  /**
   * Delete a song, its stored objects, then announce it. Other contexts react on
   * their own — this method does not wait for them or fail if they do (ADR-0002).
   * Ordering per ADR-0004: row first, then bytes.
   */
  async remove(ownerId: Uuid, id: Uuid): Promise<void> {
    const song = await this.songs.byId(id, ownerId);
    if (!song) return;
    await this.songs.remove(song.id);
    await this.files.delete(song.audio.storageKey);
    if (song.coverArt) await this.files.delete(song.coverArt.storageKey);
    this.events.publish(new SongDeleted(song.id, song.ownerId));
  }

  async streamAudio(
    ownerId: Uuid,
    id: Uuid,
    range?: ByteRange,
  ): Promise<StreamedFile> {
    const song = await this.get(ownerId, id);
    const bytes = await this.files.getRange(song.audio.storageKey, range);
    return { ...bytes, contentType: song.audio.contentType };
  }

  async getCover(ownerId: Uuid, id: Uuid): Promise<StreamedFile> {
    const song = await this.get(ownerId, id);
    if (!song.coverArt) throw new NotFoundException('Song has no cover');
    const bytes = await this.files.getRange(song.coverArt.storageKey);
    return { ...bytes, contentType: song.coverArt.contentType };
  }
}
