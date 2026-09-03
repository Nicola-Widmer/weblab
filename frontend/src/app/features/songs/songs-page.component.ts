import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  injectMutation,
  injectQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import type { SongDto } from '../../api';
import {
  songsControllerListOptions,
  songsControllerListQueryKey,
  songsControllerRemoveMutation,
} from '../../api/@tanstack/angular-query-experimental.gen';
import { PlayerService } from '../player/player.service';
import { SongEditDialogComponent } from './song-edit-dialog.component';
import { SongListComponent } from './song-list.component';
import { SongUploadComponent } from './song-upload.component';

/**
 * The `/` route. Smart component: owns the library query and the delete
 * mutation, and is the one place where deletion meets playback (removing the
 * playing song stops the player). Upload keeps its own mutation.
 */
@Component({
  selector: 'app-songs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SongUploadComponent, SongListComponent, SongEditDialogComponent, TranslatePipe],
  template: `
    <h1>{{ 'songs.title' | translate }}</h1>
    <app-song-upload />
    <app-song-list
      [songs]="songs.data() ?? []"
      [isPending]="songs.isPending()"
      [isError]="songs.isError()"
      (play)="play($event)"
      (edit)="editing.set($event)"
      (delete)="remove($event)"
    />
    @if (removal.isError()) {
      <p>{{ 'songs.delete.error' | translate }}</p>
    }
    <app-song-edit-dialog [song]="editing()" (closed)="editing.set(null)" />
  `,
})
export class SongsPageComponent {
  private readonly queryClient =  inject(QueryClient);
  private readonly player = inject(PlayerService);
  private readonly translate = inject(TranslateService);

  /** The song currently open in the edit dialog, or `null` when closed. */
  protected readonly editing = signal<SongDto | null>(null);

  protected readonly songs = injectQuery(() => songsControllerListOptions());
  protected readonly removal = injectMutation(() => ({
    ...songsControllerRemoveMutation(),
    onSuccess: () =>
      this.queryClient.invalidateQueries({
        queryKey: songsControllerListQueryKey(),
      }),
  }));

  play(song: SongDto): void {
    this.player.play(song, this.songs.data() ?? [song]);
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
