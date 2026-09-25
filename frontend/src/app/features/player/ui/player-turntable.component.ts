import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { LucideMusic } from '@lucide/angular';
import type { SongDto } from '../../../api';
import { songCoverUrl } from '../../../shared/song-asset-urls';

/** 33⅓ rpm — one revolution in milliseconds. */
const REV_MS = 1800;
/** Motor spin-up: quick, responsive. */
const SPIN_UP_MS = 550;
/** Platter coast-down after the motor cuts: long, roughly constant friction. */
const SPIN_DOWN_MS = 1200;
/** Ignore playing=false blips shorter than this (they happen on every track change). */
const GUARD_MS = 140;
/** Cue delay — the arm drops onto the groove shortly after the platter is up to speed. */
const ARM_DROP_MS = 180;

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const linear = (t: number): number => t;

/**
 * The drawer's "now playing" visual: an album cover mounted as the label of a
 * spinning vinyl record, with a tonearm that cues in and out with playback.
 *
 * The record turns via a single infinite Web Animations rotation whose
 * `playbackRate` we ramp between 0 and 1 — that gives a real motor spin-up and
 * an inertial coast-down while keeping the rotation itself on the compositor.
 * The tonearm is a pure CSS transform transition.
 *
 * The optimus-ui drawer destroys its content on close, so this component (and
 * its animation) is rebuilt on every open: it snaps straight to the correct
 * speed on init and only ramps for play/pause toggles the user actually sees.
 */
@Component({
  selector: 'app-player-turntable',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block relative aspect-square' },
  imports: [LucideMusic],
  template: `
    @let s = song();
    <div class="relative size-full" [class.not-ready]="!ready()">
      <div
        #disc
        class="disc absolute inset-0 rounded-full will-change-transform [transform:translateZ(0)]"
      >
        <div
          class="label absolute left-1/2 top-1/2 aspect-square w-[38%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full ring-2 ring-inset ring-black/30"
        >
          @if (s && s.hasCover) {
            <img [src]="coverUrl(s.id)" alt="" class="size-full object-cover" />
          } @else {
            <div
              class="flex size-full items-center justify-center bg-surface-300 text-surface-500 dark:bg-surface-600 dark:text-surface-300"
            >
              <svg lucideMusic class="size-1/3"></svg>
            </div>
          }
        </div>
      </div>

      <div
        class="spindle absolute left-1/2 top-1/2 z-20 aspect-square w-[2.4%] min-w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
      ></div>

      <div
        class="sheen pointer-events-none absolute inset-0 z-10 rounded-full mix-blend-screen"
      ></div>

      <svg
        class="tonearm pointer-events-none absolute right-[6%] top-[5%] z-30 w-[54%] overflow-visible drop-shadow-[0_3px_5px_rgba(0,0,0,0.35)]"
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden="true"
      >
        <g class="arm" [style.transform]="armTransform()">
          <rect x="78" y="9.5" width="18" height="9" rx="4.5" fill="#8b9099" />
          <circle cx="76" cy="19" r="9" fill="#33363b" />
          <circle cx="76" cy="19" r="4.5" fill="#b9bdc4" />
          <rect x="12" y="16.9" width="65" height="4.2" rx="2.1" fill="#c9ccd2" />
          <g transform="rotate(24 16 19)">
            <rect x="7" y="14.5" width="13" height="9" rx="2" fill="#3a3d42" />
            <circle cx="9" cy="24.5" r="1.8" fill="#e6e7ea" />
          </g>
        </g>
      </svg>
    </div>
  `,
  styles: `
    .disc {
      background:
        repeating-radial-gradient(
          circle at 50% 50%,
          rgba(255, 255, 255, 0.035) 0 1px,
          rgba(0, 0, 0, 0) 1px 3px
        ),
        radial-gradient(circle at 50% 50%, #232323 0%, #141414 45%, #0a0a0a 78%, #050505 100%);
      box-shadow:
        inset 0 0 0 2px rgba(255, 255, 255, 0.04),
        inset 0 0 22px rgba(0, 0, 0, 0.7),
        0 12px 28px -8px rgba(0, 0, 0, 0.55);
    }
    .spindle {
      background: radial-gradient(circle at 35% 30%, #f4f5f7, #a9adb5 60%, #6c7078);
    }
    .sheen {
      background: linear-gradient(
        122deg,
        rgba(255, 255, 255, 0.22) 0%,
        rgba(255, 255, 255, 0.05) 18%,
        rgba(255, 255, 255, 0) 38%,
        rgba(255, 255, 255, 0) 60%,
        rgba(255, 255, 255, 0.08) 100%
      );
    }
    .arm {
      transform-origin: 76px 19px;
      transition: transform 680ms cubic-bezier(0.34, 1.15, 0.5, 1);
    }
    .not-ready .arm {
      transition: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .arm {
        transition: none;
      }
    }
  `,
})
export class PlayerTurntableComponent {
  readonly song = input<SongDto | null>(null);
  readonly playing = input(false);

  protected readonly coverUrl = songCoverUrl;
  protected readonly ready = signal(false);
  /**
   * Swung right off the disc when idle, down onto the outer groove when engaged.
   * The idle angle reads as clearly "parked"; the arm's swing stays inside the
   * square stage, well clear of the drawer's clipped rounded corners.
   */
  protected readonly armTransform = computed(() => `rotate(${this.#armEngaged() ? 5 : 40}deg)`);

  readonly #armEngaged = signal(false);

  private readonly discRef = viewChild<ElementRef<HTMLElement>>('disc');
  readonly #destroyRef = inject(DestroyRef);

  readonly #reduceMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  #spin?: Animation;
  #rafId = 0;
  #timer: ReturnType<typeof setTimeout> | undefined;
  /** Whether the record should currently be turning (playing AND a song loaded). */
  #desired = false;

  constructor() {
    effect(() => {
      const next = this.playing() && this.song() != null;
      untracked(() => this.#onDesiredChange(next));
    });

    afterNextRender(() => {
      this.#setup();
      requestAnimationFrame(() => this.ready.set(true));

      const onVisibility = (): void => {
        if (!this.#spin) return;
        if (document.hidden) this.#spin.pause();
        else if (this.#desired && !this.#reduceMotion) this.#spin.play();
      };
      document.addEventListener('visibilitychange', onVisibility);
      this.#destroyRef.onDestroy(() => {
        document.removeEventListener('visibilitychange', onVisibility);
        clearTimeout(this.#timer);
        cancelAnimationFrame(this.#rafId);
        this.#spin?.cancel();
      });
    });
  }

  /** Build the rotation and snap it to the current state — no ramp on open. */
  #setup(): void {
    const el = this.discRef()?.nativeElement;
    if (el && typeof el.animate === 'function' && !this.#reduceMotion) {
      this.#spin = el.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
        duration: REV_MS,
        iterations: Infinity,
        easing: 'linear',
      });
      this.#spin.playbackRate = this.#desired ? 1 : 0;
      if (this.#desired && !document.hidden) this.#spin.play();
      else this.#spin.pause();
    }
    clearTimeout(this.#timer);
    this.#armEngaged.set(this.#desired);
  }

  /** React to a play/pause (or song) change once the component is live. */
  #onDesiredChange(next: boolean): void {
    if (next === this.#desired) return;
    this.#desired = next;
    clearTimeout(this.#timer);

    if (next) {
      this.#rampTo(1, SPIN_UP_MS, easeOutCubic);
      this.#timer = setTimeout(() => this.#armEngaged.set(true), ARM_DROP_MS);
    } else {
      this.#timer = setTimeout(() => {
        this.#armEngaged.set(false);
        this.#rampTo(0, SPIN_DOWN_MS, linear);
      }, GUARD_MS);
    }
  }

  /** Ease `playbackRate` toward `target` over `ms`, keeping rotation on the compositor. */
  #rampTo(target: number, ms: number, ease: (t: number) => number): void {
    const spin = this.#spin;
    if (!spin || this.#reduceMotion) {
      if (spin) spin.playbackRate = target;
      return;
    }
    cancelAnimationFrame(this.#rafId);
    const from = spin.playbackRate;
    if (Math.abs(from - target) < 0.001) {
      spin.playbackRate = target;
      if (target === 0) spin.pause();
      return;
    }
    if (target > 0) spin.play();

    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / ms);
      spin.playbackRate = from + (target - from) * ease(t);
      if (t < 1) this.#rafId = requestAnimationFrame(step);
      else if (target === 0) spin.pause();
    };
    this.#rafId = requestAnimationFrame(step);
  }
}
