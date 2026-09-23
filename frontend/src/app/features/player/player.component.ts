import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PlayerService } from './player.service';
import { PlayerDrawerComponent } from './player-drawer.component';
import { PlayerNowPlayingComponent } from './ui/player-now-playing.component';
import { PlayerScrubberComponent } from './ui/player-scrubber.component';
import { PlayerTransportComponent } from './ui/player-transport.component';
import { PlayerVolumeComponent } from './ui/player-volume.component';

/**
 * Sticky bottom transport bar, always visible. Pure view: playback lives in
 * `PlayerService`; this wires the dumb clusters to it and toggles the expanded
 * drawer raised by tapping the cover.
 */
@Component({
  selector: 'app-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PlayerNowPlayingComponent,
    PlayerTransportComponent,
    PlayerScrubberComponent,
    PlayerVolumeComponent,
    PlayerDrawerComponent,
  ],
  template: `
    @let song = player.current();
    <footer
      class="fixed inset-x-0 bottom-0 z-50 border-t border-surface-200 bg-surface-0/85 backdrop-blur dark:border-surface-700 dark:bg-surface-900/85"
    >
      <div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2 sm:gap-6">
        <app-player-now-playing [song]="song" (expand)="expanded.set(true)" />
        <div class="flex flex-none flex-col items-center gap-1.5 sm:flex-[2]">
          <app-player-transport
            [playing]="player.playing()"
            [disabled]="!song"
            (previous)="player.previous()"
            (toggle)="player.toggle()"
            (next)="player.next()"
          />
          <app-player-scrubber
            class="hidden sm:flex"
            [currentTime]="player.currentTime()"
            [duration]="player.duration()"
            [disabled]="!song"
            (seek)="player.seek($event)"
          />
        </div>
        <app-player-volume
          class="hidden sm:flex"
          [volume]="player.volume()"
          [disabled]="!song"
          (volumeChange)="player.setVolume($event)"
        />
      </div>
    </footer>

    <!-- Drawer (turntable, arc scrubber) stays out of the initial bundle -->
    @defer (on idle) {
      <app-player-drawer [visible]="expanded()" (visibleChange)="expanded.set($event)" />
    }
  `,
})
export class PlayerComponent {
  protected readonly player = inject(PlayerService);
  protected readonly expanded = signal(false);
}
