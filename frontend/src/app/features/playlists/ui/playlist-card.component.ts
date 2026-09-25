import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideListMusic, LucidePencil, LucideTrash2 } from '@lucide/angular';
import { Button } from '@openng/optimus-ui/button';
import type { PlaylistDto } from '../../../api';
import { PlaylistRenameFormComponent } from './playlist-rename-form.component';

/**
 * A single playlist tile: cover placeholder + name linking to the detail route,
 * with hover actions to rename (inline, via `PlaylistRenameFormComponent`) or
 * delete. Purely presentational — both actions are reported through outputs so
 * `PlaylistsPageComponent` owns the mutations.
 */
@Component({
  selector: 'app-playlist-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslatePipe,
    Button,
    PlaylistRenameFormComponent,
    LucideListMusic,
    LucidePencil,
    LucideTrash2,
  ],
  template: `
    <div
      class="group relative flex flex-col gap-3 rounded-xl border border-surface-200 p-4 text-left transition hover:border-primary-500 dark:border-surface-700"
    >
      <a [routerLink]="['/playlists', playlist().id]" class="flex flex-col gap-3">
        <div
          class="flex aspect-square items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800"
        >
          <svg lucideListMusic class="size-8 text-surface-400 sm:size-10"></svg>
        </div>
        <!-- Kept in flow while editing (just hidden) so the card height doesn't
             jump when the overlaid rename form takes over. From sm up the
             hover actions sit beside the text, so keep it clear of them. -->
        <div class="min-w-0 sm:pr-16" [class.invisible]="editing()">
          <p class="truncate font-semibold">{{ playlist().name }}</p>
          <p class="text-sm text-surface-500 dark:text-surface-400">
            {{ 'playlists.card.tracks' | translate: { count: playlist().trackCount } }}
          </p>
        </div>
      </a>

      @if (editing()) {
        <app-playlist-rename-form
          class="absolute inset-x-4 bottom-4 rounded-lg bg-surface-0 dark:bg-surface-950"
          [name]="playlist().name"
          (save)="commitRename($event)"
          (cancelled)="editing.set(false)"
        />
      } @else {
        <!-- Phones: always visible, over the cover's corner (a narrow card has
             no room beside the text). sm+: revealed on hover beside the text. -->
        <div
          class="absolute right-5 top-5 flex gap-1 rounded-full bg-surface-0/80 opacity-100 transition sm:bottom-3 sm:right-2 sm:top-auto sm:bg-transparent sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 dark:bg-surface-950/60 sm:dark:bg-transparent"
        >
          <p-button
            type="button"
            size="small"
            severity="secondary"
            [text]="true"
            [rounded]="true"
            (onClick)="editing.set(true)"
            [ariaLabel]="'playlists.actions.edit' | translate"
          >
            <svg lucidePencil class="size-4"></svg>
          </p-button>
          <p-button
            type="button"
            size="small"
            severity="secondary"
            [text]="true"
            [rounded]="true"
            (onClick)="delete.emit(playlist())"
            [ariaLabel]="'playlists.actions.delete' | translate"
          >
            <svg lucideTrash2 class="size-4"></svg>
          </p-button>
        </div>
      }
    </div>
  `,
})
export class PlaylistCardComponent {
  readonly playlist = input.required<PlaylistDto>();

  /** Rename to `name` (already trimmed and non-empty; may equal the current name). */
  readonly rename = output<{ id: string; name: string }>();
  readonly delete = output<PlaylistDto>();

  protected readonly editing = signal(false);

  protected commitRename(name: string): void {
    const playlist = this.playlist();
    if (name !== playlist.name) this.rename.emit({ id: playlist.id, name });
    this.editing.set(false);
  }
}
