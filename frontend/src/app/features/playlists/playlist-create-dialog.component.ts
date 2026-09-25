import { ChangeDetectionStrategy, Component, inject, model, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Button } from '@openng/optimus-ui/button';
import { Dialog } from '@openng/optimus-ui/dialog';
import { InputText } from '@openng/optimus-ui/inputtext';
import { injectMutation, QueryClient } from '@tanstack/angular-query-experimental';
import {
  playlistsControllerCreateMutation,
  playlistsControllerListQueryKey,
} from '../../api/@tanstack/angular-query-experimental.gen';

/**
 * Modal for creating a playlist. Bind `open` (two-way) to toggle it; owns the
 * Signal Forms model, the `create` mutation and the list invalidation.
 */
@Component({
  selector: 'app-playlist-create-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dialog, Button, InputText, FormField, TranslatePipe],
  template: `
    <p-dialog
      [visible]="open()"
      [modal]="true"
      [header]="'playlists.create.title' | translate"
      (onHide)="close()"
    >
      <form class="flex w-80 flex-col gap-3" (submit)="$event.preventDefault(); save()">
        <label class="flex flex-col gap-1 text-sm">
          {{ 'playlists.create.fieldName' | translate }}
          <input pInputText [formField]="f.name" />
          @if (f.name().touched()) {
            @for (error of f.name().errors(); track error.kind) {
              <span class="text-red-600">{{ error.message }}</span>
            }
          }
        </label>
        @if (mutation.isError()) {
          <span class="text-sm text-red-600">{{ 'playlists.create.error' | translate }}</span>
        }
        <div class="mt-2 flex justify-end gap-2">
          <p-button type="button" severity="secondary" [text]="true" (onClick)="close()">
            {{ 'playlists.create.cancel' | translate }}
          </p-button>
          <p-button
            type="submit"
            [disabled]="mutation.isPending()"
            [loading]="mutation.isPending()"
          >
            {{ 'playlists.create.save' | translate }}
          </p-button>
        </div>
      </form>
    </p-dialog>
  `,
})
export class PlaylistCreateDialogComponent {
  readonly #queryClient = inject(QueryClient);
  readonly #translate = inject(TranslateService);

  /** Two-way bound by the host to show / hide the dialog. */
  readonly open = model(false);

  protected readonly model = signal({ name: '' });

  protected readonly f = form(this.model, (path) => {
    required(path.name, {
      message: () => this.#translate.instant('playlists.create.nameRequired'),
    });
  });

  protected readonly mutation = injectMutation(() => ({
    ...playlistsControllerCreateMutation(),
    onSuccess: () => {
      this.#queryClient.invalidateQueries({ queryKey: playlistsControllerListQueryKey() });
      this.close();
    },
  }));

  protected save(): void {
    // `submit` marks the form touched and skips the action when invalid.
    void submit(this.f, async () => {
      try {
        await this.mutation.mutateAsync({ body: { name: this.model().name } });
      } catch {
        // Surfaced to the user via `mutation.isError()`.
      }
    });
  }

  protected close(): void {
    this.mutation.reset();
    this.model.set({ name: '' });
    this.open.set(false);
  }
}
