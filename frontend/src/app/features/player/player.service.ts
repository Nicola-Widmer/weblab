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
  readonly #audio = new Audio();

  readonly #current = signal<SongDto | null>(null);
  readonly #queue = signal<readonly SongDto[]>([]);
  readonly #playing = signal(false);
  readonly #currentTime = signal(0);
  readonly #duration = signal(0);
  readonly #volume = signal(1);

  readonly current = this.#current.asReadonly();
  readonly playing = this.#playing.asReadonly();
  readonly currentTime = this.#currentTime.asReadonly();
  readonly duration = this.#duration.asReadonly();
  readonly volume = this.#volume.asReadonly();

  constructor() {
    const a = this.#audio;
    a.addEventListener('play', () => this.#playing.set(true));
    a.addEventListener('pause', () => this.#playing.set(false));
    a.addEventListener('timeupdate', () => this.#currentTime.set(a.currentTime));
    a.addEventListener('loadedmetadata', () => this.#duration.set(a.duration || 0));
    a.addEventListener('ended', () => this.next());
  }

  play(song: SongDto, queue: readonly SongDto[] = [song]): void {
    this.#queue.set(queue);
    this.#load(song);
  }

  toggle(): void {
    if (!this.#current()) return;
    if (this.#audio.paused) this.#start();
    else this.#audio.pause();
  }

  seek(seconds: number): void {
    this.#audio.currentTime = seconds;
  }

  setVolume(level: number): void {
    this.#volume.set(level);
    this.#audio.volume = level;
  }

  /** Advance to the next song in the queue, or stop if there is none. */
  next(): void {
    const queue = this.#queue();
    const index = queue.findIndex((song) => song.id === this.#current()?.id);
    const upcoming = index >= 0 && index + 1 < queue.length ? queue[index + 1] : null;
    if (upcoming) this.#load(upcoming);
    else this.stop();
  }

  /** Step back to the previous song in the queue, if there is one. */
  previous(): void {
    const queue = this.#queue();
    const index = queue.findIndex((song) => song.id === this.#current()?.id);
    if (index > 0) this.#load(queue[index - 1]);
  }

  stop(): void {
    this.#audio.pause();
    this.#audio.removeAttribute('src');
    this.#audio.load();
    this.#current.set(null);
    this.#currentTime.set(0);
    this.#duration.set(0);
  }

  #load(song: SongDto): void {
    this.#current.set(song);
    this.#currentTime.set(0);
    this.#duration.set(0);
    this.#audio.src = songAudioUrl(song.id);
    this.#audio.volume = this.#volume();
    this.#start();
  }

  #start(): void {
    this.#audio.play().catch(() => undefined);
  }
}
