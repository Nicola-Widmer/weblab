import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import type { SongDto } from '../../api';
import { songCoverUrl } from '../../shared/song-asset-urls';

/**
 * Left cluster of the player bar: cover thumbnail + title/artist, or an idle
 * placeholder. Tapping the cover asks the host to expand the full player.
 */
@Component({
  selector: 'app-player-now-playing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-w-0 flex-1 items-center gap-3' },
  imports: [TranslatePipe],
  template: `
    @let s = song();
    <button
      type="button"
      class="size-10 shrink-0 overflow-hidden rounded bg-surface-200 transition hover:opacity-80 dark:bg-surface-700"
      [attr.aria-label]="'player.expand' | translate"
      (click)="expand.emit()"
    >
      @if (s && s.hasCover) {
        <img [src]="coverUrl(s.id)" alt="" class="size-full object-cover" />
      }
    </button>
    <div class="min-w-0 text-sm">
      <div class="truncate font-medium">{{ s?.title ?? ('player.idle' | translate) }}</div>
      @if (s && s.artist) {
        <div class="truncate text-xs text-surface-500 dark:text-surface-400">{{ s.artist }}</div>
      }
    </div>
  `,
})
export class PlayerNowPlayingComponent {
  readonly song = input<SongDto | null>(null);
  readonly expand = output<void>();
  protected readonly coverUrl = songCoverUrl;
}
