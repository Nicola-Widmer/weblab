import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucidePause, LucidePlay, LucideSkipBack, LucideSkipForward } from '@lucide/angular';

/** Prev / play-pause / next buttons. Presentational — reports intent through outputs. */
@Component({
  selector: 'app-player-transport',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex items-center gap-3 text-surface-500 dark:text-surface-400 [&_button:disabled]:opacity-40',
  },
  imports: [TranslatePipe, LucidePause, LucidePlay, LucideSkipBack, LucideSkipForward],
  template: `
    <button
      type="button"
      [disabled]="disabled()"
      [attr.aria-label]="'player.previous' | translate"
      (click)="previous.emit()"
    >
      <svg lucideSkipBack class="size-5"></svg>
    </button>
    <button
      type="button"
      class="flex size-9 items-center justify-center rounded-full bg-surface-900 text-surface-0 dark:bg-surface-0 dark:text-surface-900"
      [disabled]="disabled()"
      [attr.aria-label]="(playing() ? 'player.pause' : 'player.play') | translate"
      (click)="toggle.emit()"
    >
      @if (playing()) {
        <svg lucidePause class="size-5"></svg>
      } @else {
        <svg lucidePlay class="size-5"></svg>
      }
    </button>
    <button
      type="button"
      [disabled]="disabled()"
      [attr.aria-label]="'player.next' | translate"
      (click)="next.emit()"
    >
      <svg lucideSkipForward class="size-5"></svg>
    </button>
  `,
})
export class PlayerTransportComponent {
  readonly playing = input(false);
  readonly disabled = input(false);
  readonly previous = output<void>();
  readonly toggle = output<void>();
  readonly next = output<void>();
}
