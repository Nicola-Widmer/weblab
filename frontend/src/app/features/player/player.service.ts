import { Injectable, computed, signal } from '@angular/core';
import type { SongDto } from '../../api';
import { songAudioUrl } from '../../shared/song-asset-urls';

/** Minimal playback store: just the currently selected song. */
@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly _current = signal<SongDto | null>(null);
  private readonly _queue = signal<readonly SongDto[]>([]);

  readonly current = this._current.asReadonly();
  readonly audioUrl = computed(() => {
    const song = this._current();
    return song ? songAudioUrl(song.id) : null;
  });

  play(song: SongDto, queue: readonly SongDto[] = [song]): void {
    this._queue.set(queue);
    this._current.set(song);
  }

  /** Advance to the next song in the queue, or stop if there is none. */
  next(): void {
    const queue = this._queue();
    const currentId = this._current()?.id;
    const index = queue.findIndex((song) => song.id === currentId);
    this._current.set(index >= 0 && index + 1 < queue.length ? queue[index + 1] : null);
  }

  stop(): void {
    this._current.set(null);
  }
}
