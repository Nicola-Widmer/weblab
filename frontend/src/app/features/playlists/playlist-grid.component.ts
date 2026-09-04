import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideListMusic } from '@lucide/angular';
import { DataView } from '@openng/optimus-ui/dataview';
import type { PlaylistDto } from '../../api';

/**
 * Presentational grid of playlists: takes the already-fetched playlists plus the
 * query's status flags and renders each as a card tile linking to the playlist
 * detail route. Fetching lives in `SongsPageComponent`.
 */
@Component({
  selector: 'app-playlist-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataView, RouterLink, TranslatePipe, LucideListMusic],
  template: `
    @if (isPending()) {
      <p>{{ 'playlists.list.loading' | translate }}</p>
    } @else if (isError()) {
      <p>{{ 'playlists.list.error' | translate }}</p>
    } @else {
      <p-dataview
        layout="grid"
        [value]="playlists()"
        [emptyMessage]="'playlists.list.empty' | translate"
      >
        <ng-template #grid let-items>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            @for (playlist of items; track playlist.id) {
              <a
                [routerLink]="['/playlists', playlist.id]"
                class="flex flex-col gap-3 rounded-xl border border-surface-200 p-4 text-left transition hover:border-primary-500 dark:border-surface-700"
              >
                <div
                  class="flex aspect-square items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800"
                >
                  <svg lucideListMusic class="size-10 text-surface-400"></svg>
                </div>
                <div class="min-w-0">
                  <p class="truncate font-semibold">{{ playlist.name }}</p>
                  <p class="text-sm text-surface-500 dark:text-surface-400">
                    {{ 'playlists.card.tracks' | translate: { count: playlist.trackCount } }}
                  </p>
                </div>
              </a>
            }
          </div>
        </ng-template>
      </p-dataview>
    }
  `,
})
export class PlaylistGridComponent {
  readonly playlists = input<PlaylistDto[]>([]);
  readonly isPending = input(false);
  readonly isError = input(false);
}
