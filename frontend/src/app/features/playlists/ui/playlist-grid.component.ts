import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DataView } from '@openng/optimus-ui/dataview';
import type { PlaylistDto } from '../../../api';
import { PlaylistCardComponent } from './playlist-card.component';
import { PlaylistGridSkeletonComponent } from './playlist-grid-skeleton.component';

/**
 * Presentational grid of playlists: takes the already-fetched playlists plus the
 * query's status flags and renders each through `PlaylistCardComponent`. While
 * pending it defers to `PlaylistGridSkeletonComponent`. Fetching lives in
 * `PlaylistsPageComponent`, which also owns the rename / delete mutations the
 * cards report through the re-emitted outputs.
 */
@Component({
  selector: 'app-playlist-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataView, TranslatePipe, PlaylistCardComponent, PlaylistGridSkeletonComponent],
  template: `
    @if (isPending()) {
      <app-playlist-grid-skeleton />
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
              <app-playlist-card
                [playlist]="playlist"
                (rename)="rename.emit($event)"
                (delete)="delete.emit($event)"
              />
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

  readonly rename = output<{ id: string; name: string }>();
  readonly delete = output<PlaylistDto>();
}
