import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { injectMutation, injectQuery, QueryClient } from '@tanstack/angular-query-experimental';
import type { PlaylistDto, PlaylistEntryDto, SongDto } from '../../api';
import {
  playlistsControllerAddEntryMutation,
  playlistsControllerGetQueryKey,
  playlistsControllerListOptions,
  playlistsControllerListQueryKey,
  playlistsControllerRemoveEntryMutation,
  playlistsControllerReorderMutation,
  songsControllerListQueryKey,
  songsControllerRemoveMutation,
} from '../../api/@tanstack/angular-query-experimental.gen';
import { PlayerService } from '../../features/player/player.service';
import { SongEditDialogComponent } from './song-edit-dialog.component';
import { SongListComponent, type SongRow } from './song-list.component';

/**
 * Smart wrapper around the presentational `SongListComponent`. Owns everything a
 * song row can trigger — playback, the edit dialog, the delete mutation (with
 * its confirm + "stop the player if it was this song") and "Add to Playlist" —
 * so any host only has to feed it the rows to show. The playback queue is
 * whatever list it was given, so playing a row inside a playlist keeps playing
 * that playlist.
 *
 * When `playlist` is supplied the row menu offers "Remove from Playlist"
 * instead of "Delete": it drops just the entry the row stands for (rows carry
 * their `entryId`) and leaves the song itself untouched.
 */
@Component({
  selector: 'app-song-list-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SongListComponent, SongEditDialogComponent, TranslatePipe],
  template: `
    <app-song-list
      [rows]="rows()"
      [isPending]="isPending()"
      [isError]="isError()"
      [playlists]="playlists.data() ?? []"
      [variant]="variant()"
      [reorderable]="reorderable()"
      (play)="play($event)"
      (edit)="editing.set($event)"
      (delete)="remove($event)"
      (removeFromPlaylist)="removeFromPlaylist($event)"
      (addToPlaylist)="addToPlaylist($event)"
      (reorder)="reorderEntries($event)"
    />
    @if (removal.isError()) {
      <p>{{ 'songs.delete.error' | translate }}</p>
    }
    @if (entryRemoval.isError()) {
      <p>{{ 'songs.removeFromPlaylist.error' | translate }}</p>
    }
    @if (reordering.isError()) {
      <p>{{ 'songs.reorder.error' | translate }}</p>
    }
    <app-song-edit-dialog [song]="editing()" (closed)="editing.set(null)" />
  `,
})
export class SongListPanelComponent {
  readonly #queryClient = inject(QueryClient);
  readonly #player = inject(PlayerService);
  readonly #translate = inject(TranslateService);

  /** Rows to render, in display order. */
  readonly rows = input<SongRow[]>([]);
  readonly isPending = input(false);
  readonly isError = input(false);
  /** When set, the menu removes rows from this playlist instead of deleting the song. */
  readonly playlist = input<PlaylistDto | null>(null);

  /** The song currently open in the edit dialog, or `null` when closed. */
  protected readonly editing = signal<SongDto | null>(null);

  protected readonly variant = computed<'library' | 'playlist'>(() =>
    this.playlist() ? 'playlist' : 'library',
  );

  /** Drag / "Move Up/Down" only make sense in a playlist with something to sort. */
  protected readonly reorderable = computed(() => !!this.playlist() && this.rows().length >= 2);

  /** Display order is also the playback queue. */
  readonly #queue = computed<SongDto[]>(() => this.rows().map((r) => r.song));

  // The row menu's "Add to Playlist" submenu reads this.
  protected readonly playlists = injectQuery(() => playlistsControllerListOptions());

  protected readonly removal = injectMutation(() => ({
    ...songsControllerRemoveMutation(),
    onSuccess: () =>
      this.#queryClient.invalidateQueries({ queryKey: songsControllerListQueryKey() }),
  }));

  protected readonly entryRemoval = injectMutation(() => ({
    ...playlistsControllerRemoveEntryMutation(),
    onSuccess: (_data, variables) => {
      this.#queryClient.invalidateQueries({ queryKey: playlistsControllerListQueryKey() });
      this.#queryClient.invalidateQueries({
        queryKey: playlistsControllerGetQueryKey({ path: { id: variables.path.id } }),
      });
    },
  }));

  protected readonly addEntry = injectMutation(() => ({
    ...playlistsControllerAddEntryMutation(),
    // Refresh both the grid (track counts) and the specific playlist's detail
    // query — the latter is what `PlaylistDetailComponent` renders from.
    onSuccess: (_data, variables) => {
      this.#queryClient.invalidateQueries({ queryKey: playlistsControllerListQueryKey() });
      this.#queryClient.invalidateQueries({
        queryKey: playlistsControllerGetQueryKey({ path: { id: variables.path.id } }),
      });
    },
  }));

  /**
   * Persist a new entry order. Optimistically rewrites the cached playlist —
   * both the array order and each entry's `position`, since the detail view
   * re-sorts rows on `position` — then rolls back on error.
   */
  protected readonly reordering = injectMutation(() => ({
    ...playlistsControllerReorderMutation(),
    onMutate: async (variables) => {
      const key = playlistsControllerGetQueryKey({ path: { id: variables.path.id } });
      await this.#queryClient.cancelQueries({ queryKey: key });
      const previous = this.#queryClient.getQueryData<PlaylistDto>(key);
      if (previous) {
        const byId = new Map(previous.entries.map((e) => [e.id, e]));
        const entries = variables.body.entryIds
          .map((id, position): PlaylistEntryDto | undefined => {
            const entry = byId.get(id);
            return entry ? { ...entry, position } : undefined;
          })
          .filter((e): e is PlaylistEntryDto => !!e);
        this.#queryClient.setQueryData<PlaylistDto>(key, { ...previous, entries });
      }
      return { key, previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) this.#queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, _error, variables) => {
      this.#queryClient.invalidateQueries({
        queryKey: playlistsControllerGetQueryKey({ path: { id: variables.path.id } }),
      });
      this.#queryClient.invalidateQueries({ queryKey: playlistsControllerListQueryKey() });
    },
  }));

  reorderEntries(entryIds: string[]): void {
    const playlist = this.playlist();
    if (!playlist) return;
    this.reordering.mutate({ path: { id: playlist.id }, body: { entryIds } });
  }

  play(song: SongDto): void {
    const queue = this.#queue();
    this.#player.play(song, queue.length ? queue : [song]);
  }

  addToPlaylist({ song, playlistId }: { song: SongDto; playlistId: string }): void {
    this.addEntry.mutate({ path: { id: playlistId }, body: { songId: song.id } });
  }

  remove(song: SongDto): void {
    const prompt = this.#translate.instant('songs.delete.confirm', { title: song.title });
    if (!confirm(prompt)) return;
    if (this.#player.current()?.id === song.id) this.#player.stop();
    this.removal.mutate({ path: { id: song.id } });
  }

  removeFromPlaylist({ song, entryId }: { song: SongDto; entryId: string }): void {
    const playlist = this.playlist();
    if (!playlist) return;
    const prompt = this.#translate.instant('songs.removeFromPlaylist.confirm', {
      title: song.title,
    });
    if (!confirm(prompt)) return;
    this.entryRemoval.mutate({ path: { id: playlist.id, entryId } });
  }
}
