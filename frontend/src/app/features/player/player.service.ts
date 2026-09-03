import { Injectable, signal } from '@angular/core';
import type { SongDto } from '../../api';
import { songAudioUrl } from '../../shared/song-asset-urls';

/**
 * Playback store. Owns a single detached `<audio>` element as the source of
 * truth and mirrors its state into signals, so any view (the bar, the drawer)
 * can render playback without holding the element itself.
 */
@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly audio = new Audio();

  private readonly _current = signal<SongDto | null>(null);
  private readonly _queue = signal<readonly SongDto[]>([]);
  private readonly _playing = signal(false);
  private readonly _currentTime = signal(0);
  private readonly _duration = signal(0);
  private readonly _volume = signal(1);

  readonly current = this._current.asReadonly();
  readonly playing = this._playing.asReadonly();
  readonly currentTime = this._currentTime.asReadonly();
  readonly duration = this._duration.asReadonly();
  readonly volume = this._volume.asReadonly();

  constructor() {
    const a = this.audio;
    a.addEventListener('play', () => this._playing.set(true));
    a.addEventListener('pause', () => this._playing.set(false));
    a.addEventListener('timeupdate', () => this._currentTime.set(a.currentTime));
    a.addEventListener('loadedmetadata', () => this._duration.set(a.duration || 0));
    a.addEventListener('ended', () => this.next());
  }

  play(song: SongDto, queue: readonly SongDto[] = [song]): void {
    this._queue.set(queue);
    this.load(song);
  }

  toggle(): void {
    if (!this._current()) return;
    if (this.audio.paused) this.start();
    else this.audio.pause();
  }

  seek(seconds: number): void {
    this.audio.currentTime = seconds;
  }

  setVolume(level: number): void {
    this._volume.set(level);
    this.audio.volume = level;
  }

  /** Advance to the next song in the queue, or stop if there is none. */
  next(): void {
    const queue = this._queue();
    const index = queue.findIndex((song) => song.id === this._current()?.id);
    const upcoming = index >= 0 && index + 1 < queue.length ? queue[index + 1] : null;
    if (upcoming) this.load(upcoming);
    else this.stop();
  }

  /** Step back to the previous song in the queue, if there is one. */
  previous(): void {
    const queue = this._queue();
    const index = queue.findIndex((song) => song.id === this._current()?.id);
    if (index > 0) this.load(queue[index - 1]);
  }

  stop(): void {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this._current.set(null);
    this._currentTime.set(0);
    this._duration.set(0);
  }

  private load(song: SongDto): void {
    this._current.set(song);
    this._currentTime.set(0);
    this._duration.set(0);
    this.audio.src = songAudioUrl(song.id);
    this.audio.volume = this._volume();
    this.start();
  }

  private start(): void {
    this.audio.play().catch(() => undefined);
  }
}
