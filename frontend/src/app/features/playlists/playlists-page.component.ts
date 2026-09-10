import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LucidePlus } from '@lucide/angular';
import { Button } from '@openng/optimus-ui/button';
import { injectMutation, injectQuery, QueryClient } from '@tanstack/angular-query-experimental';
import type { PlaylistDto } from '../../api';
import {
  playlistsControllerListOptions,
  playlistsControllerListQueryKey,
  playlistsControllerRemoveMutation,
  playlistsControllerRenameMutation,
} from '../../api/@tanstack/angular-query-experimental.gen';
import { PlaylistCreateDialogComponent } from './playlist-create-dialog.component';
import { PlaylistGridComponent } from './ui/playlist-grid.component';

/**
 * The `/playlists` route. Owns the playlist list query plus the rename / delete
 * mutations; the grid is presentational and reports inline rename and delete
 * through outputs. The header button opens the create dialog.
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
      (rename)="rename($event)"
      (delete)="remove($event)"
    />

    @if (renameMutation.isError() || removeMutation.isError()) {
      <p class="mt-2 text-sm text-red-600">{{ 'playlists.actions.error' | translate }}</p>
    }

    <app-playlist-create-dialog [(open)]="creating" />
  `,
})
export class PlaylistsPageComponent {
  private readonly queryClient = inject(QueryClient);
  private readonly translate = inject(TranslateService);

  protected readonly playlists = injectQuery(() => playlistsControllerListOptions());
  protected readonly creating = signal(false);

  protected readonly renameMutation = injectMutation(() => ({
    ...playlistsControllerRenameMutation(),
    onSuccess: () =>
      this.queryClient.invalidateQueries({ queryKey: playlistsControllerListQueryKey() }),
  }));

  protected readonly removeMutation = injectMutation(() => ({
    ...playlistsControllerRemoveMutation(),
    onSuccess: () =>
      this.queryClient.invalidateQueries({ queryKey: playlistsControllerListQueryKey() }),
  }));

  protected rename({ id, name }: { id: string; name: string }): void {
    this.renameMutation.mutate({ path: { id }, body: { name } });
  }

  protected remove(playlist: PlaylistDto): void {
    const prompt = this.translate.instant('playlists.delete.confirm', { name: playlist.name });
    if (!confirm(prompt)) return;
    this.removeMutation.mutate({ path: { id: playlist.id } });
  }
}
