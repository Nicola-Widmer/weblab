import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideVolume2 } from '@lucide/angular';
import { Slider } from '@openng/optimus-ui/slider';

/** Speaker icon + volume slider (0–1). Emits `volumeChange` on every change. */
@Component({
  selector: 'app-player-volume',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 items-center justify-end gap-2' },
  imports: [FormsModule, Slider, TranslatePipe, LucideVolume2],
  template: `
    <svg lucideVolume2 class="size-4 shrink-0 text-surface-500 dark:text-surface-400"></svg>
    <p-slider
      class="w-24"
      [min]="0"
      [max]="1"
      [step]="0.01"
      [disabled]="disabled()"
      [ariaLabel]="'player.volume' | translate"
      [ngModel]="volume()"
      (onChange)="volumeChange.emit($event.value ?? 1)"
    />
  `,
})
export class PlayerVolumeComponent {
  readonly volume = input(1);
  readonly disabled = input(false);
  readonly volumeChange = output<number>();
}
