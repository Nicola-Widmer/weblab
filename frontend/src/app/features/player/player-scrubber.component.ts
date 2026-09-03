import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Slider, type SliderChangeEvent } from '@openng/optimus-ui/slider';

const mmss = (seconds: number): string => {
  const s = Math.floor(seconds || 0);
  return `${Math.floor(s / 60)}:${`${s % 60}`.padStart(2, '0')}`;
};

/**
 * Elapsed / total clock around a seek slider.
 *
 * `p-slider` writes the bound value straight to the handle on every change, so
 * letting `currentTime` through mid-drag yanks the handle back to the playhead.
 * While the user drags, `scrubTo` holds their position and the incoming
 * `currentTime` is ignored; the audio is only moved once, on release (or on a
 * track click / keyboard step, which have no slide-end). `scrubTo` is dropped
 * again once playback has reached that spot.
 */
@Component({
  selector: 'app-player-scrubber',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex w-full items-center gap-2 text-xs tabular-nums text-surface-500 dark:text-surface-400',
  },
  imports: [FormsModule, Slider, TranslatePipe],
  template: `
    <span>{{ fmt(position()) }}</span>
    <p-slider
      class="flex-1"
      [min]="0"
      [step]="0.1"
      [max]="duration() || 1"
      [disabled]="disabled()"
      [ariaLabel]="'player.seek' | translate"
      [ngModel]="position()"
      (onChange)="preview($event)"
      (onSlideEnd)="commit($event.value ?? 0)"
    />
    <span>{{ fmt(duration()) }}</span>
  `,
})
export class PlayerScrubberComponent {
  readonly currentTime = input(0);
  readonly duration = input(0);
  readonly disabled = input(false);
  readonly seek = output<number>();
  protected readonly fmt = mmss;

  private readonly scrubTo = signal<number | null>(null);
  protected readonly position = computed(() => this.scrubTo() ?? this.currentTime());

  constructor() {
    // Release the held position once playback has caught up to it.
    effect(() => {
      const target = this.scrubTo();
      if (target !== null && Math.abs(this.currentTime() - target) < 1) {
        this.scrubTo.set(null);
      }
    });
  }

  /** Fires continuously while dragging: move the handle only, leave playback be. */
  protected preview(event: SliderChangeEvent): void {
    const value = event.value ?? 0;
    this.scrubTo.set(value);
    // Keyboard steps emit no slide-end, so seek right away for those.
    if (event.event instanceof KeyboardEvent) this.seek.emit(value);
  }

  /** Drag released or track clicked: now move playback. */
  protected commit(value: number): void {
    this.scrubTo.set(value);
    this.seek.emit(value);
  }
}
