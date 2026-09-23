import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { songsControllerListOptions } from '../../api/@tanstack/angular-query-experimental.gen';
import { SongListPanelComponent } from '../../shared/songs/song-list-panel.component';
import type { SongRow } from '../../shared/songs/song-list.component';
import { SongUploadComponent } from './song-upload.component';

/**
 * The `/songs` route. Owns the library query and wraps the shared song-list
 * panel in the upload drop zone; every row interaction (play, edit, delete,
 * add-to-playlist) lives in the panel.
 */
@Component({
  selector: 'app-songs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SongUploadComponent, SongListPanelComponent, TranslatePipe],
  template: `
    <h1 class="mb-4">{{ 'songs.title' | translate }}</h1>

    <app-song-upload>
      <app-song-list-panel
        [rows]="rows()"
        [isPending]="songs.isPending()"
        [isError]="songs.isError()"
      />
    </app-song-upload>
  `,
})
export default class SongsPageComponent {
  protected readonly songs = injectQuery(() => songsControllerListOptions());

  protected readonly rows = computed<SongRow[]>(() =>
    (this.songs.data() ?? []).map((song) => ({ song })),
  );
}
