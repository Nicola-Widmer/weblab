import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService, translate } from '@ngx-translate/core';
import {
  injectMutation,
  injectQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { SelectButton } from '@openng/optimus-ui/selectbutton';
import type { SongDto } from '../../api';
import {
  playlistsControllerAddEntryMutation,
  playlistsControllerListOptions,
  playlistsControllerListQueryKey,
  songsControllerListOptions,
  songsControllerListQueryKey,
  songsControllerRemoveMutation,
} from '../../api/@tanstack/angular-query-experimental.gen';
import { PlaylistGridComponent } from '../playlists/playlist-grid.component';
import { PlayerService } from '../player/player.service';
import { SongEditDialogComponent } from './song-edit-dialog.component';
import { SongListComponent } from './song-list.component';
import { SongUploadComponent } from './song-upload.component';

type LibraryView = 'songs' | 'playlists';

/**
 * The `/` route. Smart component: owns the library query and the delete
 * mutation, and is the one place where deletion meets playback (removing the
 * playing song stops the player). Upload keeps its own mutation. A
 * `p-selectButton` toggles between the song list and the playlist grid; the
 * playlist query only runs while that view is active.
 */
@Component({
  selector: 'app-songs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SongUploadComponent,
    SongListComponent,
    SongEditDialogComponent,
    PlaylistGridComponent,
    SelectButton,
    FormsModule,
    TranslatePipe,
  ],
  template: `
    <div class="mb-4 flex items-center justify-between gap-3">
      <h1>{{ (view() === 'songs' ? 'songs.title' : 'playlists.title') | translate }}</h1>
      <p-selectButton
        [options]="viewOptions()"
        optionLabel="label"
        optionValue="value"
        [allowEmpty]="false"
        [ngModel]="view()"
        (ngModelChange)="view.set($event)"
      />
    </div>

    @if (view() === 'songs') {
      <app-song-upload>
        <app-song-list
          [songs]="songs.data() ?? []"
          [isPending]="songs.isPending()"
          [isError]="songs.isError()"
          [playlists]="playlists.data() ?? []"
          (play)="play($event)"
          (edit)="editing.set($event)"
          (delete)="remove($event)"
          (addToPlaylist)="addToPlaylist($event)"
        />
      </app-song-upload>
      @if (removal.isError()) {
        <p>{{ 'songs.delete.error' | translate }}</p>
      }
      <app-song-edit-dialog [song]="editing()" (closed)="editing.set(null)" />
    } @else {
      <app-playlist-grid
        [playlists]="playlists.data() ?? []"
        [isPending]="playlists.isPending()"
        [isError]="playlists.isError()"
      />
    }
  `,
})
export class SongsPageComponent {
  private readonly queryClient = inject(QueryClient);
  private readonly player = inject(PlayerService);
  private readonly translate = inject(TranslateService);

  /** Which half of the library is on screen. */
  protected readonly view = signal<LibraryView>('songs');

  private readonly songsLabel = translate('library.views.songs');
  private readonly playlistsLabel = translate('library.views.playlists');
  protected readonly viewOptions = computed(() => [
    { label: this.songsLabel(), value: 'songs' satisfies LibraryView },
    { label: this.playlistsLabel(), value: 'playlists' satisfies LibraryView },
  ]);

  /** The song currently open in the edit dialog, or `null` when closed. */
  protected readonly editing = signal<SongDto | null>(null);

  protected readonly songs = injectQuery(() => songsControllerListOptions());
  // Always fetched: the playlist grid and every song row's "Add to Playlist"
  // submenu both read this.
  protected readonly playlists = injectQuery(() => playlistsControllerListOptions());
  protected readonly removal = injectMutation(() => ({
    ...songsControllerRemoveMutation(),
    onSuccess: () =>
      this.queryClient.invalidateQueries({
        queryKey: songsControllerListQueryKey(),
      }),
  }));
  protected readonly addEntry = injectMutation(() => ({
    ...playlistsControllerAddEntryMutation(),
    onSuccess: () =>
      this.queryClient.invalidateQueries({
        queryKey: playlistsControllerListQueryKey(),
      }),
  }));

  play(song: SongDto): void {
    this.player.play(song, this.songs.data() ?? [song]);
  }

  addToPlaylist({ song, playlistId }: { song: SongDto; playlistId: string }): void {
    this.addEntry.mutate({ path: { id: playlistId }, body: { songId: song.id } });
  }

  remove(song: SongDto): void {
    const prompt = this.translate.instant('songs.delete.confirm', {
      title: song.title,
    });
    if (!confirm(prompt)) return;
    if (this.player.current()?.id === song.id) this.player.stop();
    this.removal.mutate({ path: { id: song.id } });
  }
}
