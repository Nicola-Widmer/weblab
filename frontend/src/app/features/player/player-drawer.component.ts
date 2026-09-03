import { ChangeDetectionStrategy, Component, inject, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Drawer } from '@openng/optimus-ui/drawer';
import { PlayerService } from './player.service';
import { PlayerScrubberComponent } from './player-scrubber.component';
import { PlayerTransportComponent } from './player-transport.component';
import { PlayerVolumeComponent } from './player-volume.component';
import { songCoverUrl } from '../../shared/song-asset-urls';

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
    PlayerScrubberComponent,
    PlayerTransportComponent,
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
      <div class="mx-auto flex h-full max-w-sm flex-col items-center justify-center gap-8 px-6 pb-10">
        <div
          class="aspect-square w-full max-w-64 overflow-hidden rounded-2xl bg-surface-200 shadow-lg dark:bg-surface-700"
        >
          @if (song && song.hasCover) {
            <img [src]="coverUrl(song.id)" alt="" class="size-full object-cover" />
          }
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
        <app-player-scrubber
          [currentTime]="player.currentTime()"
          [duration]="player.duration()"
          [disabled]="!song"
          (seek)="player.seek($event)"
        />
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
  protected readonly coverUrl = songCoverUrl;
  readonly visible = model(false);
}
