import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideListMusic, LucideArrowLeft } from '@lucide/angular';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { SongDto } from '../../api';
import {
  playlistsControllerGetOptions,
  songsControllerListOptions,
} from '../../api/@tanstack/angular-query-experimental.gen';
import { SongListPanelComponent } from '../../shared/songs/song-list-panel.component';
import type { SongRow } from '../../shared/songs/song-list.component';
import { PlaylistDetailSkeletonComponent } from './ui/playlist-detail-skeleton.component';

/**
 * The `/playlists/:id` route. Fetches the playlist and the song library, then
 * resolves each ordered entry to its song. Header shows a cover placeholder
 * next to the title and creation date; the ordered songs render below through
 * the same shared panel the library uses, so play / edit / delete / add-to-
 * playlist all work identically here.
 */
@Component({
  selector: 'app-playlist-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    TranslatePipe,
    SongListPanelComponent,
    PlaylistDetailSkeletonComponent,
    LucideListMusic,
    LucideArrowLeft,
  ],
  template: `
    <a
      routerLink="/playlists"
      class="mb-4 inline-flex items-center gap-1 text-sm text-surface-500 hover:text-primary-500 dark:text-surface-400"
    >
      <svg lucideArrowLeft class="size-4"></svg>
      {{ 'playlists.detail.back' | translate }}
    </a>

    @if (playlist.isPending()) {
      <app-playlist-detail-skeleton />
    } @else if (playlist.isError()) {
      <p>{{ 'playlists.detail.error' | translate }}</p>
    } @else if (playlist.data(); as p) {
      <div class="mb-6 flex items-center gap-4">
        <div
          class="flex aspect-square w-28 shrink-0 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800"
        >
          <svg lucideListMusic class="size-10 text-surface-400"></svg>
        </div>
        <div class="min-w-0">
          <h1 class="truncate text-2xl font-semibold">{{ p.name }}</h1>
          <p class="text-sm text-surface-500 dark:text-surface-400">
            {{ 'playlists.detail.created' | translate }} {{ p.createdAt | date: 'medium' }}
          </p>
        </div>
      </div>

      @if (songs.isError()) {
        <p>{{ 'songs.list.error' | translate }}</p>
      } @else if (rows().length === 0 && !songs.isPending()) {
        <p class="text-surface-500 dark:text-surface-400">
          {{ 'playlists.detail.empty' | translate }}
        </p>
      } @else {
        <app-song-list-panel
          [rows]="rows()"
          [isPending]="songs.isPending()"
          [playlist]="p"
        />
      }
    }
  `,
})
export class PlaylistDetailComponent {
  /** Bound from the `:id` route param via `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  protected readonly playlist = injectQuery(() =>
    playlistsControllerGetOptions({ path: { id: this.id() } }),
  );
  protected readonly songs = injectQuery(() => songsControllerListOptions());

  /**
   * Playlist entries in order, each joined to its song and keeping its `entryId`
   * (unresolved entries dropped). Duplicates of a song stay distinct rows.
   */
  protected readonly rows = computed<SongRow[]>(() => {
    const byId = new Map<string, SongDto>((this.songs.data() ?? []).map((s) => [s.id, s]));
    const ordered = (this.playlist.data()?.entries ?? [])
      .slice()
      .sort((a, b) => a.position - b.position);
    const rows: SongRow[] = [];
    for (const e of ordered) {
      const song = byId.get(e.songId);
      if (song) rows.push({ song, entryId: e.id });
    }
    return rows;
  });
}
