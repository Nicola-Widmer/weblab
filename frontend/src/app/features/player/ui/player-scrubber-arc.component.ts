import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Lower-semicircle path, drawn clear of the vinyl: radius 59 in the 100×100
 * viewBox where the disc is radius 50. The svg keeps `overflow: visible` so the
 * ~9% that spills past the box shows; it lands in the drawer's `gap-8` above the
 * title. Endpoints sit a little outside the disc's 9- and 3-o'clock edges.
 */
const ARC_D = 'M -9 50 A 59 59 0 0 0 109 50';
const ARC_R = 59;
/** Keyboard seek increment, seconds. */
const STEP = 5;

const mmss = (seconds: number): string => {
  const s = Math.floor(seconds || 0);
  return `${Math.floor(s / 60)}:${`${s % 60}`.padStart(2, '0')}`;
};

/**
 * Circular seek control that wraps the bottom half of the turntable. Rendered
 * as an SVG overlay ({@link ARC_D}); progress is a second copy of the path with
 * `pathLength="1"` so the dash offset is just `1 - fraction` — no arc-length
 * maths. A fat transparent stroke is the pointer target, with pointer capture so
 * drags that wander off the band keep tracking.
 *
 * Mirrors the drag/commit dance of the straight `p-slider` scrubber: while the
 * user drags, {@link scrubTo} holds their position and incoming `currentTime` is
 * ignored; playback is moved once, on release (or on a keyboard step). The hold
 * is dropped once playback catches up.
 */
@Component({
  selector: 'app-player-scrubber-arc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.disabled]': 'disabled()', '[class.dragging]': 'dragging()' },
  imports: [TranslatePipe],
  template: `
    <svg
      #svg
      viewBox="0 0 100 100"
      role="slider"
      [attr.tabindex]="disabled() ? -1 : 0"
      [attr.aria-label]="'player.seek' | translate"
      aria-valuemin="0"
      [attr.aria-valuemax]="duration()"
      [attr.aria-valuenow]="position()"
      [attr.aria-valuetext]="fmt(position()) + ' / ' + fmt(duration())"
      [attr.aria-disabled]="disabled()"
      (keydown)="key($event)"
    >
      <path class="track" [attr.d]="d" />
      <path class="fill" [attr.d]="d" pathLength="1" [style.stroke-dashoffset]="1 - frac()" />
      <circle class="handle" [attr.cx]="handle().x" [attr.cy]="handle().y" r="3.4" />
      <text class="time" x="50" y="84" text-anchor="middle">
        {{ fmt(position()) }} / {{ fmt(duration()) }}
      </text>
      <path
        class="hit"
        [attr.d]="d"
        (pointerdown)="down($event)"
        (pointermove)="move($event)"
        (pointerup)="up($event)"
        (pointercancel)="up($event)"
      />
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      width: 100%;
      height: 100%;
      overflow: visible;
      pointer-events: none;
    }
    .track,
    .fill {
      fill: none;
      stroke: currentColor;
      stroke-width: 2.5;
      stroke-linecap: round;
    }
    .track {
      opacity: 0.22;
    }
    .fill {
      stroke-dasharray: 1;
      transition: stroke-dashoffset 100ms linear;
    }
    .handle {
      fill: currentColor;
      transition:
        cx 100ms linear,
        cy 100ms linear,
        r 120ms ease;
    }
    /* While dragging, track the pointer 1:1 — the easing is only for playback steps. */
    :host(.dragging) .fill,
    :host(.dragging) .handle {
      transition: none;
    }
    /* Always sits on the black vinyl, so it stays light in both themes. */
    .time {
      fill: #fff;
      font-size: 6px;
      font-variant-numeric: tabular-nums;
      opacity: 0.65;
    }
    .hit {
      fill: none;
      stroke: transparent;
      stroke-width: 12;
      stroke-linecap: round;
      pointer-events: stroke;
      cursor: pointer;
      touch-action: none;
    }
    svg:focus-visible {
      outline: none;
    }
    svg:focus-visible .handle {
      r: 4.6;
    }
    :host(.disabled) svg {
      opacity: 0.4;
    }
    :host(.disabled) .hit {
      pointer-events: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .fill,
      .handle {
        transition: none;
      }
    }
  `,
})
export class PlayerScrubberArcComponent {
  readonly currentTime = input(0);
  readonly duration = input(0);
  readonly disabled = input(false);
  readonly seek = output<number>();

  protected readonly fmt = mmss;
  protected readonly d = ARC_D;

  private readonly svgRef = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  readonly #scrubTo = signal<number | null>(null);
  protected readonly dragging = signal(false);

  protected readonly position = computed(() => this.#scrubTo() ?? this.currentTime());
  protected readonly frac = computed(() => {
    const d = this.duration();
    return d > 0 ? Math.min(1, Math.max(0, this.position() / d)) : 0;
  });
  protected readonly handle = computed(() => {
    const th = this.frac() * Math.PI;
    return { x: 50 - ARC_R * Math.cos(th), y: 50 + ARC_R * Math.sin(th) };
  });

  constructor() {
    // Release the held position once playback has caught up to it.
    effect(() => {
      const target = this.#scrubTo();
      if (target !== null && Math.abs(this.currentTime() - target) < 1) {
        this.#scrubTo.set(null);
      }
    });
  }

  protected down(e: PointerEvent): void {
    if (this.disabled()) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    this.svgRef().nativeElement.focus();
    this.dragging.set(true);
    this.#scrubTo.set(this.#valueAt(e));
    e.preventDefault();
  }

  protected move(e: PointerEvent): void {
    if (this.dragging()) this.#scrubTo.set(this.#valueAt(e));
  }

  protected up(e: PointerEvent): void {
    if (!this.dragging()) return;
    const value = this.#valueAt(e);
    this.#scrubTo.set(value); // still flagged dragging → snaps to the release point
    this.seek.emit(value);
    this.dragging.set(false);
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }

  protected key(e: KeyboardEvent): void {
    const d = this.duration();
    if (!d || this.disabled()) return;
    const cur = this.position();
    let value: number;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        value = Math.min(d, cur + STEP);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        value = Math.max(0, cur - STEP);
        break;
      case 'Home':
        value = 0;
        break;
      case 'End':
        value = d;
        break;
      default:
        return;
    }
    e.preventDefault();
    this.#scrubTo.set(value);
    this.seek.emit(value);
  }

  /** Map a pointer event to a time by its angle around the arc's centre. */
  #valueAt(e: PointerEvent): number {
    const rect = this.svgRef().nativeElement.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100 - 50;
    const py = ((e.clientY - rect.top) / rect.height) * 100 - 50;
    let th = Math.atan2(py, -px);
    if (th < 0) th = px > 0 ? Math.PI : 0; // above the diameter → snap to nearest end
    return (th / Math.PI) * (this.duration() || 0);
  }
}
