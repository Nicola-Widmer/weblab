import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideGripVertical } from '@lucide/angular';
import type { PlaylistDto, SongDto } from '../../api';
import { songCoverUrl } from '../song-asset-urls';
import { SongMenuComponent } from './song-menu.component';

/**
 * One row of the song list: a cover pane, then the columns that line up with the
 * list header (title | artist | album | time | ⋯ menu). A full-bleed overlay
 * button makes the whole row (everything but the menu) a play target; the menu
 * cell is lifted above it with `z-10`. The separator sits on the inner grid so
 * it starts at the title, not under the cover. Presentational — reports intent
 * through `play` / `edit` / `delete` / `move` / `addToPlaylist`, all but `play`
 * forwarded from `app-song-menu`.
 *
 * In `reorderable` mode (playlist detail) the host carries `cdkDrag` from the
 * parent list, a grip badge covers the cover on hover, and the menu gains
 * "Move Up" / "Move Down".
 */
@Component({
  selector: 'app-song-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [DatePipe, TranslatePipe, SongMenuComponent, LucideGripVertical],
  template: `
    @let s = song();
    <div
      class="group relative grid grid-cols-[2.5rem_1fr] items-center gap-3 rounded px-2 transition hover:bg-surface-100 dark:hover:bg-surface-800/60"
      [class.cursor-grab]="reorderable()"
    >
      <button
        type="button"
        class="absolute inset-0 z-0 cursor-pointer"
        [attr.aria-label]="'songs.row.playTitle' | translate: { title: s.title }"
        (click)="playSong.emit(s)"
      ></button>
      <div class="relative size-[35px] self-center">
        <img
          [src]="s.hasCover ? coverUrl(s.id) : ''"
          [alt]="s.hasCover ? ('songs.row.coverAlt' | translate: { title: s.title }) : ''"
          width="35"
          height="35"
          loading="lazy"
          class="size-full rounded bg-surface-200 object-cover dark:bg-surface-700"
        />
        @if (reorderable()) {
          <span
            class="pointer-events-none absolute inset-0 flex items-center justify-center rounded bg-surface-900/55 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            aria-hidden="true"
            [title]="'songs.row.dragHandle' | translate: { title: s.title }"
          >
            <svg lucideGripVertical class="size-4"></svg>
          </span>
        }
      </div>
      <div
        class="grid grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-3 border-surface-200 py-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_auto_2.75rem] dark:border-surface-700"
        [class.border-t]="!firstRow()"
      >
        <span class="truncate">{{ s.title }}</span>
        <span class="hidden truncate text-surface-600 sm:block dark:text-surface-400">{{
          s.artist
        }}</span>
        <span class="hidden truncate text-surface-600 sm:block dark:text-surface-400">{{
          s.album
        }}</span>
        <span class="text-right tabular-nums text-surface-600 dark:text-surface-400">
          {{ s.duration * 1000 | date: 'm:ss' : 'UTC' }}
        </span>
        <div class="relative z-10 flex justify-end">
          <app-song-menu
            [song]="s"
            [entryId]="entryId()"
            [reorderable]="reorderable()"
            [firstRow]="firstRow()"
            [lastRow]="lastRow()"
            [playlists]="playlists()"
            [variant]="variant()"
            (playSong)="playSong.emit($event)"
            (edit)="edit.emit($event)"
            (delete)="delete.emit($event)"
            (move)="move.emit($event)"
            (removeFromPlaylist)="removeFromPlaylist.emit($event)"
            (addToPlaylist)="addToPlaylist.emit($event)"
          />
        </div>
      </div>
    </div>
  `,
})
export class SongRowComponent {
  readonly song = input.required<SongDto>();
  /** First row draws no separator; also disables the menu's "Move Up". */
  readonly firstRow = input(false);
  /** Last row — disables the menu's "Move Down". */
  readonly lastRow = input(false);
  /** Playlist-detail reorder mode: show the drag grip and the move menu items. */
  readonly reorderable = input(false);
  /** The playlist entry this row stands for, when rendered inside a playlist. */
  readonly entryId = input<string>();
  /** Playlists offered in the row's "Add to Playlist" submenu. */
  readonly playlists = input<PlaylistDto[]>([]);
  /** Forwarded to `app-song-menu` — see its `variant` input. */
  readonly variant = input<'library' | 'playlist'>('library');
  readonly playSong = output<SongDto>();
  readonly edit = output<SongDto>();
  readonly delete = output<SongDto>();
  readonly move = output<{ entryId: string; direction: -1 | 1 }>();
  readonly removeFromPlaylist = output<{ song: SongDto; entryId: string }>();
  readonly addToPlaylist = output<{ song: SongDto; playlistId: string }>();

  protected readonly coverUrl = songCoverUrl;
}
