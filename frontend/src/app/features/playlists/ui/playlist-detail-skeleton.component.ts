import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Skeleton } from '@openng/optimus-ui/skeleton';
import { SongListSkeletonComponent } from '../../../shared/songs/song-list-skeleton.component';

/**
 * Ghost-loading view for the `/playlists/:id` route: a placeholder header (cover
 * square, title and date bars) above the shared song-list skeleton. Shown while
 * the playlist query is pending.
 */
@Component({
  selector: 'app-playlist-detail-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton, SongListSkeletonComponent],
  template: `
    <div class="mb-6 flex items-center gap-4">
      <div class="aspect-square w-28 shrink-0">
        <p-skeleton width="100%" height="100%" borderRadius="0.5rem" />
      </div>
      <div class="min-w-0 flex-1 space-y-2">
        <p-skeleton width="12rem" height="2rem" />
        <p-skeleton width="9rem" height="0.875rem" />
      </div>
    </div>
    <app-song-list-skeleton />
  `,
})
export class PlaylistDetailSkeletonComponent {}
