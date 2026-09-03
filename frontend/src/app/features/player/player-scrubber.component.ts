import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Slider } from '@openng/optimus-ui/slider';

const mmss = (seconds: number): string => {
  const s = Math.floor(seconds || 0);
  return `${Math.floor(s / 60)}:${`${s % 60}`.padStart(2, '0')}`;
};

/**
 * Elapsed / total clock around a seek slider. The parent drives `currentTime`;
 * user scrubs are reported through `seek` (seconds) on slide end, so writing the
 * audio position never fights the incoming value mid-drag.
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
    <span>{{ fmt(currentTime()) }}</span>
    <p-slider
      class="flex-1"
      [min]="0"
      [step]="0.1"
      [max]="duration() || 1"
      [disabled]="disabled()"
      [ariaLabel]="'player.seek' | translate"
      [ngModel]="currentTime()"
      (onSlideEnd)="seek.emit($event.value ?? 0)"
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
}
