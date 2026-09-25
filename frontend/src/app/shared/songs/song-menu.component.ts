import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe, translate } from '@ngx-translate/core';
import {
  LucideArrowDown,
  LucideArrowUp,
  LucideEllipsis,
  LucideListPlus,
  LucidePencil,
  LucidePlay,
  LucideTrash2,
} from '@lucide/angular';
import { Button } from '@openng/optimus-ui/button';
import { TieredMenu } from '@openng/optimus-ui/tieredmenu';
import type { MenuItem } from '@openng/optimus-ui/api';
import type { PlaylistDto, SongDto } from '../../api';

/**
 * The `⋯` actions menu for a single song: the trigger button plus a
 * `p-tieredMenu` whose "Add to Playlist" branch is built from `playlists`.
 * Purely presentational — every choice is reported through an output, so
 * `SongRowComponent` (or any other host) decides what it means.
 */
@Component({
  selector: 'app-song-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Button,
    TieredMenu,
    TranslatePipe,
    LucideArrowDown,
    LucideArrowUp,
    LucideEllipsis,
    LucideListPlus,
    LucidePencil,
    LucidePlay,
    LucideTrash2,
  ],
  template: `
    <p-button
      type="button"
      severity="secondary"
      size="small"
      [text]="true"
      [rounded]="true"
      [ariaLabel]="'songs.row.moreActions' | translate"
      (onClick)="menu.toggle($event)"
    >
      <svg lucideEllipsis class="size-5"></svg>
    </p-button>
    <p-tieredmenu #menu [model]="items()" popup appendTo="body">
      <ng-template #item let-item>
        <span class="flex items-center gap-2 px-3 py-1.5 text-sm">
          @switch (item.icon) {
            @case ('play') {
              <svg lucidePlay class="size-4"></svg>
            }
            @case ('edit') {
              <svg lucidePencil class="size-4"></svg>
            }
            @case ('move-up') {
              <svg lucideArrowUp class="size-4"></svg>
            }
            @case ('move-down') {
              <svg lucideArrowDown class="size-4"></svg>
            }
            @case ('add') {
              <svg lucideListPlus class="size-4"></svg>
            }
            @case ('trash') {
              <svg lucideTrash2 class="size-4"></svg>
            }
          }
          {{ item.label }}
        </span>
      </ng-template>
    </p-tieredmenu>
  `,
})
export class SongMenuComponent {
  readonly song = input.required<SongDto>();
  /** Playlists offered in the "Add to Playlist" submenu. */
  readonly playlists = input<PlaylistDto[]>([]);
  /**
   * `'library'` (default) offers "Delete", which removes the song everywhere.
   * `'playlist'` swaps that for "Remove from Playlist", which only drops the
   * entry from the playlist being viewed.
   */
  readonly variant = input<'library' | 'playlist'>('library');
  /** The playlist entry this menu acts on, in the `'playlist'` variant. */
  readonly entryId = input<string>();
  /** When true (playlist variant), offer "Move Up" / "Move Down". */
  readonly reorderable = input(false);
  /** Disables "Move Up" — this is the first row. */
  readonly firstRow = input(false);
  /** Disables "Move Down" — this is the last row. */
  readonly lastRow = input(false);
  readonly play = output<SongDto>();
  readonly edit = output<SongDto>();
  readonly delete = output<SongDto>();
  readonly move = output<{ entryId: string; direction: -1 | 1 }>();
  readonly removeFromPlaylist = output<{ song: SongDto; entryId: string }>();
  readonly addToPlaylist = output<{ song: SongDto; playlistId: string }>();

  readonly #playLabel = translate('songs.row.play');
  readonly #editLabel = translate('songs.row.edit');
  readonly #deleteLabel = translate('songs.row.delete');
  readonly #moveUpLabel = translate('songs.row.moveUp');
  readonly #moveDownLabel = translate('songs.row.moveDown');
  readonly #removeFromPlaylistLabel = translate('songs.row.removeFromPlaylist');
  readonly #addToPlaylistLabel = translate('songs.row.addToPlaylist');
  readonly #noPlaylistsLabel = translate('songs.row.noPlaylists');

  protected readonly items = computed<MenuItem[]>(() => {
    const playlists = this.playlists();
    const entryId = this.entryId();
    const reorderItems: MenuItem[] =
      this.reorderable() && this.variant() === 'playlist' && entryId
        ? [
            {
              label: `${this.#moveUpLabel()}`,
              icon: 'move-up',
              disabled: this.firstRow(),
              command: () => this.move.emit({ entryId, direction: -1 }),
            },
            {
              label: `${this.#moveDownLabel()}`,
              icon: 'move-down',
              disabled: this.lastRow(),
              command: () => this.move.emit({ entryId, direction: 1 }),
            },
          ]
        : [];
    const removeItem: MenuItem =
      this.variant() === 'playlist'
        ? {
            label: `${this.#removeFromPlaylistLabel()}`,
            icon: 'trash',
            disabled: !entryId,
            command: () => entryId && this.removeFromPlaylist.emit({ song: this.song(), entryId }),
          }
        : {
            label: `${this.#deleteLabel()}`,
            icon: 'trash',
            command: () => this.delete.emit(this.song()),
          };
    return [
      {
        label: `${this.#playLabel()}`,
        icon: 'play',
        command: () => this.play.emit(this.song()),
      },
      {
        label: `${this.#editLabel()}`,
        icon: 'edit',
        command: () => this.edit.emit(this.song()),
      },
      ...reorderItems,
      {
        label: `${this.#addToPlaylistLabel()}`,
        icon: 'add',
        items: playlists.length
          ? playlists.map((playlist) => ({
              label: playlist.name,
              command: () =>
                this.addToPlaylist.emit({ song: this.song(), playlistId: playlist.id }),
            }))
          : [{ label: `${this.#noPlaylistsLabel()}`, disabled: true }],
      },
      removeItem,
    ];
  });
}
