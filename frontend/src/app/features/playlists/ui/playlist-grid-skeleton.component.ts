import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Skeleton } from '@openng/optimus-ui/skeleton';

/**
 * Ghost-loading view for `PlaylistGridComponent`: eight placeholder tiles in the
 * same responsive grid and card frame, each with a square cover block and two
 * text lines. Shown while the playlist list query is pending.
 */
@Component({
  selector: 'app-playlist-grid-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton],
  template: `
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      @for (tile of tiles; track $index) {
        <div
          class="flex flex-col gap-3 rounded-xl border border-surface-200 p-4 dark:border-surface-700"
        >
          <div class="aspect-square">
            <p-skeleton width="100%" height="100%" borderRadius="0.5rem" />
          </div>
          <div class="flex flex-col gap-1.5">
            <p-skeleton width="75%" height="1rem" />
            <p-skeleton width="45%" height="0.75rem" />
          </div>
        </div>
      }
    </div>
  `,
})
export class PlaylistGridSkeletonComponent {
  protected readonly tiles = Array.from({ length: 8 });
}
