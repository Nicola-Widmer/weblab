import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DataView } from '@openng/optimus-ui/dataview';
import type { PlaylistDto, SongDto } from '../../api';
import { SongListSkeletonComponent } from './song-list-skeleton.component';
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
 * mirror `SongRowComponent`). While pending it defers to `SongListSkeletonComponent`.
 * Fetching, deletion and playback live in `SongsPageComponent`; this component
 * only forwards row events upward.
 *
 * When `reorderable` is set (playlist detail), the `p-dataview` body is swapped
 * for a `cdkDropList`: rows drag by the whole row (grip badge on hover, long-
 * press on touch) and the `⋯` menu gains "Move Up" / "Move Down". Both paths
 * emit the new entry-id order through `reorder`; the smart wrapper persists it.
 */
@Component({
  selector: 'app-song-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DataView,
    SongRowComponent,
    SongListSkeletonComponent,
    TranslatePipe,
    CdkDropList,
    CdkDrag,
  ],
  template: `
    @if (isPending()) {
      <app-song-list-skeleton />
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
            class="grid grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_auto_2.75rem]"
          >
            <span>{{ 'songs.list.columns.song' | translate }}</span>
            <span class="hidden sm:block">{{ 'songs.list.columns.artist' | translate }}</span>
            <span class="hidden sm:block">{{ 'songs.list.columns.album' | translate }}</span>
            <span class="text-right">{{ 'songs.list.columns.time' | translate }}</span>
            <span></span>
          </div>
        </div>

        @if (reorderable()) {
          <div cdkDropList (cdkDropListDropped)="onDrop($event)">
            @for (
              row of rows();
              track row.entryId ?? row.song.id;
              let first = $first;
              let last = $last
            ) {
              <div cdkDrag [cdkDragStartDelay]="dragStartDelay" class="rounded">
                <app-song-row
                  [song]="row.song"
                  [entryId]="row.entryId"
                  [firstRow]="first"
                  [lastRow]="last"
                  [reorderable]="true"
                  [playlists]="playlists()"
                  [variant]="variant()"
                  (play)="play.emit($event)"
                  (edit)="edit.emit($event)"
                  (delete)="delete.emit($event)"
                  (move)="onMove($event)"
                  (removeFromPlaylist)="removeFromPlaylist.emit($event)"
                  (addToPlaylist)="addToPlaylist.emit($event)"
                />
              </div>
            }
          </div>
        } @else {
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
        }
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
  /** Playlist detail only: enable drag + "Move Up/Down" reordering. */
  readonly reorderable = input(false);
  readonly play = output<SongDto>();
  readonly edit = output<SongDto>();
  readonly delete = output<SongDto>();
  readonly removeFromPlaylist = output<{ song: SongDto; entryId: string }>();
  readonly addToPlaylist = output<{ song: SongDto; playlistId: string }>();
  /** New order as entry ids, top to bottom, after a drag or a menu move. */
  readonly reorder = output<string[]>();

  /** Touch needs a hold before dragging so vertical scroll still works. */
  protected readonly dragStartDelay = { touch: 200, mouse: 0 };

  protected onDrop(event: CdkDragDrop<unknown>): void {
    if (event.previousIndex === event.currentIndex) return;
    const next = this.rows().slice();
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.#emitOrder(next);
  }

  protected onMove({ entryId, direction }: { entryId: string; direction: -1 | 1 }): void {
    const rows = this.rows();
    const from = rows.findIndex((r) => r.entryId === entryId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= rows.length) return;
    const next = rows.slice();
    moveItemInArray(next, from, to);
    this.#emitOrder(next);
  }

  #emitOrder(rows: SongRow[]): void {
    const ids = rows.map((r) => r.entryId).filter((id): id is string => !!id);
    if (ids.length === rows.length) this.reorder.emit(ids);
  }
}
