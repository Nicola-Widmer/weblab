import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Skeleton } from '@openng/optimus-ui/skeleton';

/**
 * Ghost-loading view for `SongListComponent`: the same `.card`, column header and
 * grid tracks as a real list, with six placeholder rows. Each row is sized to a
 * real one (50px) — the round menu placeholder sets the height. Shown while the
 * song query is pending, and reused inside `PlaylistDetailSkeletonComponent`.
 */
@Component({
  selector: 'app-song-list-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton, TranslatePipe],
  template: `
    <div class="card">
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

      @for (row of rows; track $index; let first = $first) {
        <div class="grid grid-cols-[2.5rem_1fr] items-center gap-3 px-2">
          <p-skeleton width="35px" height="35px" borderRadius="0.25rem" class="self-center" />
          <div
            class="grid grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-3 border-surface-200 py-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_auto_2.75rem] dark:border-surface-700"
            [class.border-t]="!first"
          >
            <p-skeleton width="60%" height="1rem" />
            <p-skeleton width="70%" height="1rem" class="hidden sm:block" />
            <p-skeleton width="45%" height="1rem" class="hidden sm:block" />
            <p-skeleton width="2rem" height="1rem" class="justify-self-end" />
            <p-skeleton shape="circle" size="2.125rem" class="justify-self-end" />
          </div>
        </div>
      }
    </div>
  `,
})
export class SongListSkeletonComponent {
  protected readonly rows = Array.from({ length: 6 });
}
