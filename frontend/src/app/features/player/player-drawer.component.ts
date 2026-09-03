import { ChangeDetectionStrategy, Component, inject, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Drawer } from '@openng/optimus-ui/drawer';
import { PlayerService } from './player.service';
import { PlayerScrubberArcComponent } from './player-scrubber-arc.component';
import { PlayerTransportComponent } from './player-transport.component';
import { PlayerTurntableComponent } from './player-turntable.component';
import { PlayerVolumeComponent } from './player-volume.component';

/**
 * Expanded "now playing" view — a bottom sheet raised by tapping the bar's
 * cover. Deliberately sparse for now: large artwork, the scrubber and the
 * transport. This is the canvas for richer mobile controls and visuals later.
 */
@Component({
  selector: 'app-player-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Drawer,
    TranslatePipe,
    PlayerScrubberArcComponent,
    PlayerTransportComponent,
    PlayerTurntableComponent,
    PlayerVolumeComponent,
  ],
  template: `
    @let song = player.current();
    <p-drawer
      appendTo="body"
      position="bottom"
      styleClass="!h-[85vh] overflow-hidden rounded-t-2xl"
      [visible]="visible()"
      [dismissible]="true"
      [blockScroll]="true"
      (visibleChange)="visible.set($event)"
    >
      <div
        class="mx-auto flex h-full max-w-sm flex-col items-center justify-center gap-8 px-8 pb-10"
      >
        <div class="relative w-full max-w-56">
          <app-player-turntable class="block" [song]="song" [playing]="player.playing()" />
          <app-player-scrubber-arc
            class="absolute inset-0 text-surface-900 dark:text-surface-0"
            [currentTime]="player.currentTime()"
            [duration]="player.duration()"
            [disabled]="!song"
            (seek)="player.seek($event)"
          />
        </div>
        <div class="w-full text-center">
          <div class="truncate text-lg font-semibold">
            {{ song?.title ?? ('player.idle' | translate) }}
          </div>
          @if (song && song.artist) {
            <div class="truncate text-sm text-surface-500 dark:text-surface-400">
              {{ song.artist }}
            </div>
          }
        </div>
        <app-player-transport
          class="scale-125"
          [playing]="player.playing()"
          [disabled]="!song"
          (previous)="player.previous()"
          (toggle)="player.toggle()"
          (next)="player.next()"
        />
        <app-player-volume
          class="!flex-none"
          [volume]="player.volume()"
          [disabled]="!song"
          (volumeChange)="player.setVolume($event)"
        />
      </div>
    </p-drawer>
  `,
})
export class PlayerDrawerComponent {
  protected readonly player = inject(PlayerService);
  readonly visible = model(false);
}
