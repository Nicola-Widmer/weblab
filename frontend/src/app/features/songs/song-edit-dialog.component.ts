import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Button } from '@openng/optimus-ui/button';
import { Dialog } from '@openng/optimus-ui/dialog';
import { InputText } from '@openng/optimus-ui/inputtext';
import { injectMutation, QueryClient } from '@tanstack/angular-query-experimental';
import type { SongDto } from '../../api';
import {
  songsControllerListQueryKey,
  songsControllerRetagMutation,
} from '../../api/@tanstack/angular-query-experimental.gen';

/**
 * Modal editor for a song's metadata. Open by passing a `song`; `null` closes it.
 * Owns the Signal Forms model, the `retag` mutation and the list invalidation —
 * `SongsPageComponent` just toggles which song is being edited.
 */
@Component({
  selector: 'app-song-edit-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dialog, Button, InputText, FormField, TranslatePipe],
  template: `
    <p-dialog
      [visible]="!!song()"
      [modal]="true"
      [header]="'songs.edit.title' | translate"
      (onHide)="close()"
    >
      <form class="flex w-80 flex-col gap-3" (submit)="$event.preventDefault(); save()">
        <label class="flex flex-col gap-1 text-sm">
          {{ 'songs.edit.fieldTitle' | translate }}
          <input pInputText [formField]="f.title" />
          @for (error of f.title().errors(); track error.kind) {
            <span class="text-red-600">{{ error.message }}</span>
          }
        </label>
        <label class="flex flex-col gap-1 text-sm">
          {{ 'songs.edit.fieldArtist' | translate }}
          <input pInputText [formField]="f.artist" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          {{ 'songs.edit.fieldAlbum' | translate }}
          <input pInputText [formField]="f.album" />
        </label>
        @if (mutation.isError()) {
          <span class="text-sm text-red-600">{{ 'songs.edit.error' | translate }}</span>
        }
        <div class="mt-2 flex justify-end gap-2">
          <p-button type="button" severity="secondary" [text]="true" (onClick)="close()">
            {{ 'songs.edit.cancel' | translate }}
          </p-button>
          <p-button
            type="submit"
            [disabled]="mutation.isPending()"
            [loading]="mutation.isPending()"
          >
            {{ 'songs.edit.save' | translate }}
          </p-button>
        </div>
      </form>
    </p-dialog>
  `,
})
export class SongEditDialogComponent {
  private readonly queryClient = inject(QueryClient);
  private readonly translate = inject(TranslateService);

  readonly song = input<SongDto | null>(null);
  readonly closed = output<void>();

  /** Reseeds whenever a different song is opened; free to edit in between. */
  protected readonly model = linkedSignal(() => {
    const s = this.song();
    return {
      title: s?.title ?? '',
      artist: s?.artist ?? '',
      album: s?.album ?? '',
    };
  });

  protected readonly f = form(this.model, (path) => {
    required(path.title, {
      message: () => this.translate.instant('songs.edit.titleRequired'),
    });
    maxLength(path.title, 200, {
      message: () => this.translate.instant('songs.edit.titleTooLong'),
    });
  });

  protected readonly mutation = injectMutation(() => ({
    ...songsControllerRetagMutation(),
    onSuccess: () => {
      this.queryClient.invalidateQueries({
        queryKey: songsControllerListQueryKey(),
      });
      this.close();
    },
  }));

  protected save(): void {
    const id = this.song()?.id;
    if (!id) return;
    // `submit` marks the form touched and skips the action when invalid.
    void submit(this.f, async () => {
      const m = this.model();
      try {
        await this.mutation.mutateAsync({
          path: { id },
          body: {
            title: m.title,
            artist: m.artist || undefined,
            album: m.album || undefined,
          },
        });
      } catch {
        // Silence is Gold :) yk
        // Surfaced to the user via `mutation.isError()`.
      }
    });
  }

  protected close(): void {
    this.mutation.reset();
    this.closed.emit();
  }
}
