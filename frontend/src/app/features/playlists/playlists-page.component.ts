import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucidePlus } from '@lucide/angular';
import { Button } from '@openng/optimus-ui/button';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { playlistsControllerListOptions } from '../../api/@tanstack/angular-query-experimental.gen';
import { PlaylistCreateDialogComponent } from './playlist-create-dialog.component';
import { PlaylistGridComponent } from './ui/playlist-grid.component';

/**
 * The `/playlists` route. Owns the playlist list query; the grid is
 * presentational and links each tile to `/playlists/:id`. The header button
 * opens the create dialog.
 */
@Component({
  selector: 'app-playlists-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PlaylistGridComponent,
    PlaylistCreateDialogComponent,
    Button,
    TranslatePipe,
    LucidePlus,
  ],
  template: `
    <div class="mb-4 flex items-center justify-between">
      <h1>{{ 'playlists.title' | translate }}</h1>
      <p-button size="small" (onClick)="creating.set(true)">
        <svg lucidePlus class="mr-1 size-4"></svg>
        {{ 'playlists.actions.create' | translate }}
      </p-button>
    </div>

    <app-playlist-grid
      [playlists]="playlists.data() ?? []"
      [isPending]="playlists.isPending()"
      [isError]="playlists.isError()"
    />

    <app-playlist-create-dialog [(open)]="creating" />
  `,
})
export class PlaylistsPageComponent {
  protected readonly playlists = injectQuery(() => playlistsControllerListOptions());
  protected readonly creating = signal(false);
}
