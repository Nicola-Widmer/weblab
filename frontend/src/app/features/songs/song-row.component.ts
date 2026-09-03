import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe, translate } from '@ngx-translate/core';
import { LucideEllipsis, LucidePencil, LucidePlay, LucideTrash2 } from '@lucide/angular';
import { Button } from '@openng/optimus-ui/button';
import { Menu } from '@openng/optimus-ui/menu';
import type { MenuItem } from '@openng/optimus-ui/api';
import type { SongDto } from '../../api';
import { songCoverUrl } from '../../shared/song-asset-urls';

/**
 * One row of the song list: a cover pane, then the columns that line up with the
 * list header (title | artist | album | time | ⋯ menu). The separator sits on
 * the inner grid so it starts at the title, not under the cover. Presentational
 * — reports intent through `play` / `delete`.
 */
@Component({
  selector: 'app-song-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    Button,
    Menu,
    TranslatePipe,
    LucideEllipsis,
    LucidePencil,
    LucidePlay,
    LucideTrash2,
  ],
  template: `
    @let s = song();
    <div class="grid grid-cols-[2.5rem_1fr] items-center gap-3 px-2">
      <img
        [src]="s.hasCover ? coverUrl(s.id) : ''"
        [alt]="s.hasCover ? ('songs.row.coverAlt' | translate: { title: s.title }) : ''"
        width="35"
        height="35"
        loading="lazy"
        class="self-center rounded bg-surface-200 object-cover dark:bg-surface-700"
      />
      <div
        class="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_auto_2.75rem] items-center gap-3 border-surface-200 py-2 dark:border-surface-700"
        [class.border-t]="!firstRow()"
      >
        <button type="button" class="truncate text-left" (click)="play.emit(s)">
          {{ s.title }}
        </button>
        <span class="truncate text-surface-600 dark:text-surface-400">{{ s.artist }}</span>
        <span class="truncate text-surface-600 dark:text-surface-400">{{ s.album }}</span>
        <span class="text-right tabular-nums text-surface-600 dark:text-surface-400">
          {{ s.duration * 1000 | date: 'm:ss' : 'UTC' }}
        </span>
        <div class="flex justify-end">
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
          <p-menu #menu [model]="items()" popup appendTo="body">
            <ng-template #item let-item>
              <span class="flex items-center gap-2 px-3 py-1.5 text-sm">
                @switch (item.icon) {
                  @case ('play') {
                    <svg lucidePlay class="size-4"></svg>
                  }
                  @case ('edit') {
                    <svg lucidePencil class="size-4"></svg>
                  }
                  @case ('trash') {
                    <svg lucideTrash2 class="size-4"></svg>
                  }
                }
                {{ item.label }}
              </span>
            </ng-template>
          </p-menu>
        </div>
      </div>
    </div>
  `,
})
export class SongRowComponent {
  readonly song = input.required<SongDto>();
  /** First row draws no separator. */
  readonly firstRow = input(false);
  readonly play = output<SongDto>();
  readonly edit = output<SongDto>();
  readonly delete = output<SongDto>();

  protected readonly coverUrl = songCoverUrl;

  private readonly playLabel = translate('songs.row.play');
  private readonly editLabel = translate('songs.row.edit');
  private readonly deleteLabel = translate('songs.row.delete');
  protected readonly items = computed<MenuItem[]>(() => [
    {
      label: `${this.playLabel()}`,
      icon: 'play',
      command: () => this.play.emit(this.song()),
    },
    {
      label: `${this.editLabel()}`,
      icon: 'edit',
      command: () => this.edit.emit(this.song()),
    },
    {
      label: `${this.deleteLabel()}`,
      icon: 'trash',
      command: () => this.delete.emit(this.song()),
    },
  ]);
}
