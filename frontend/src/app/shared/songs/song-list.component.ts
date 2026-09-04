import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DataView } from '@openng/optimus-ui/dataview';
import type { PlaylistDto, SongDto } from '../../api';
import { SongRowComponent } from './song-row.component';

/**
 * One entry to render. In the library a row is just a song; inside a playlist it
 * also carries the `entryId` of the occurrence it stands for, so duplicates of
 * the same song stay individually addressable (unique `@for` key, precise
 * "remove from playlist").
 */
export interface SongRow {
  song: SongDto;
  entryId?: string;
}

/**
 * Presentational list shell: takes the already-fetched rows plus the query's
 * status flags and renders them as an iTunes-style table (the header grid tracks
 * mirror `SongRowComponent`). Fetching, deletion and playback live in
 * `SongsPageComponent`; this component only forwards row events upward.
 */
@Component({
  selector: 'app-song-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataView, SongRowComponent, TranslatePipe],
  template: `
    @if (isPending()) {
      <p>{{ 'songs.list.loading' | translate }}</p>
    } @else if (isError()) {
      <p>{{ 'songs.list.error' | translate }}</p>
    } @else {
      <div class="card">
        <!-- Header lives outside p-dataview: its .p-dataview-header padding
             would otherwise offset it from the zero-padded rows. -->
        <div
          class="grid grid-cols-[2.5rem_1fr] items-center gap-3 px-2 pb-2 text-sm font-semibold text-surface-500 dark:text-surface-400"
        >
          <span></span>
          <div
            class="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_auto_2.75rem] items-center gap-3"
          >
            <span>{{ 'songs.list.columns.song' | translate }}</span>
            <span>{{ 'songs.list.columns.artist' | translate }}</span>
            <span>{{ 'songs.list.columns.album' | translate }}</span>
            <span class="text-right">{{ 'songs.list.columns.time' | translate }}</span>
            <span></span>
          </div>
        </div>
        <p-dataview [value]="rows()" [emptyMessage]="'songs.list.empty' | translate">
          <ng-template #list let-items>
            @for (row of items; track row.entryId ?? row.song.id; let first = $first) {
              <app-song-row
                [song]="row.song"
                [entryId]="row.entryId"
                [firstRow]="first"
                [playlists]="playlists()"
                [variant]="variant()"
                (play)="play.emit($event)"
                (edit)="edit.emit($event)"
                (delete)="delete.emit($event)"
                (removeFromPlaylist)="removeFromPlaylist.emit($event)"
                (addToPlaylist)="addToPlaylist.emit($event)"
              />
            }
          </ng-template>
        </p-dataview>
      </div>
    }
  `,
})
export class SongListComponent {
  readonly rows = input<SongRow[]>([]);
  readonly isPending = input(false);
  readonly isError = input(false);
  /** Playlists offered in each row's "Add to Playlist" submenu. */
  readonly playlists = input<PlaylistDto[]>([]);
  /** Forwarded to each row's menu — see `SongMenuComponent.variant`. */
  readonly variant = input<'library' | 'playlist'>('library');
  readonly play = output<SongDto>();
  readonly edit = output<SongDto>();
  readonly delete = output<SongDto>();
  readonly removeFromPlaylist = output<{ song: SongDto; entryId: string }>();
  readonly addToPlaylist = output<{ song: SongDto; playlistId: string }>();
}
