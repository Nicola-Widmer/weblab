import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { injectMutation, injectQuery, QueryClient } from '@tanstack/angular-query-experimental';
import type { SongDto } from '../../api';
import {
  playlistsControllerAddEntryMutation,
  playlistsControllerGetQueryKey,
  playlistsControllerListOptions,
  playlistsControllerListQueryKey,
  songsControllerListQueryKey,
  songsControllerRemoveMutation,
} from '../../api/@tanstack/angular-query-experimental.gen';
import { PlayerService } from '../../features/player/player.service';
import { SongEditDialogComponent } from './song-edit-dialog.component';
import { SongListComponent } from './song-list.component';

/**
 * Smart wrapper around the presentational `SongListComponent`. Owns everything a
 * song row can trigger — playback, the edit dialog, the delete mutation (with
 * its confirm + "stop the player if it was this song") and "Add to Playlist" —
 * so any host only has to feed it the songs to show. The playback queue is
 * whatever list it was given, so playing a row inside a playlist keeps playing
 * that playlist.
 */
@Component({
  selector: 'app-song-list-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SongListComponent, SongEditDialogComponent, TranslatePipe],
  template: `
    <app-song-list
      [songs]="songs()"
      [isPending]="isPending()"
      [isError]="isError()"
      [playlists]="playlists.data() ?? []"
      (play)="play($event)"
      (edit)="editing.set($event)"
      (delete)="remove($event)"
      (addToPlaylist)="addToPlaylist($event)"
    />
    @if (removal.isError()) {
      <p>{{ 'songs.delete.error' | translate }}</p>
    }
    <app-song-edit-dialog [song]="editing()" (closed)="editing.set(null)" />
  `,
})
export class SongListPanelComponent {
  private readonly queryClient = inject(QueryClient);
  private readonly player = inject(PlayerService);
  private readonly translate = inject(TranslateService);

  /** Songs to render, in display order — also the playback queue. */
  readonly songs = input<SongDto[]>([]);
  readonly isPending = input(false);
  readonly isError = input(false);

  /** The song currently open in the edit dialog, or `null` when closed. */
  protected readonly editing = signal<SongDto | null>(null);

  // The row menu's "Add to Playlist" submenu reads this.
  protected readonly playlists = injectQuery(() => playlistsControllerListOptions());

  protected readonly removal = injectMutation(() => ({
    ...songsControllerRemoveMutation(),
    onSuccess: () =>
      this.queryClient.invalidateQueries({ queryKey: songsControllerListQueryKey() }),
  }));

  protected readonly addEntry = injectMutation(() => ({
    ...playlistsControllerAddEntryMutation(),
    // Refresh both the grid (track counts) and the specific playlist's detail
    // query — the latter is what `PlaylistDetailComponent` renders from.
    onSuccess: (_data, variables) => {
      this.queryClient.invalidateQueries({ queryKey: playlistsControllerListQueryKey() });
      this.queryClient.invalidateQueries({
        queryKey: playlistsControllerGetQueryKey({ path: { id: variables.path.id } }),
      });
    },
  }));

  play(song: SongDto): void {
    this.player.play(song, this.songs().length ? this.songs() : [song]);
  }

  addToPlaylist({ song, playlistId }: { song: SongDto; playlistId: string }): void {
    this.addEntry.mutate({ path: { id: playlistId }, body: { songId: song.id } });
  }

  remove(song: SongDto): void {
    const prompt = this.translate.instant('songs.delete.confirm', { title: song.title });
    if (!confirm(prompt)) return;
    if (this.player.current()?.id === song.id) this.player.stop();
    this.removal.mutate({ path: { id: song.id } });
  }
}
