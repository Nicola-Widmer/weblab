import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideCheck, LucideX } from '@lucide/angular';
import { Button } from '@openng/optimus-ui/button';
import { InputText } from '@openng/optimus-ui/inputtext';

/**
 * Inline single-field editor for a playlist name. Seeded from `name`; emits the
 * trimmed value on `save` (Enter or the check button, disabled while empty) and
 * `cancel` on Esc or the ✕ button. The host decides whether the value actually
 * changed.
 */
@Component({
  selector: 'app-playlist-rename-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, Button, InputText, LucideCheck, LucideX],
  template: `
    <form
      class="flex flex-col gap-1 sm:flex-row sm:items-center"
      (submit)="$event.preventDefault(); submit()"
    >
      <input
        pInputText
        class="w-full"
        [value]="draft()"
        (input)="draft.set($any($event.target).value)"
        (keydown.escape)="cancelled.emit()"
        [attr.aria-label]="'playlists.rename.label' | translate"
      />
      <div class="flex justify-end gap-1 sm:contents">
        <p-button
          type="submit"
          size="small"
          [rounded]="true"
          [disabled]="!draft().trim()"
          [ariaLabel]="'playlists.rename.save' | translate"
        >
          <svg lucideCheck class="size-4"></svg>
        </p-button>
        <p-button
          type="button"
          size="small"
          severity="secondary"
          [text]="true"
          [rounded]="true"
          (onClick)="cancelled.emit()"
          [ariaLabel]="'playlists.rename.cancel' | translate"
        >
          <svg lucideX class="size-4"></svg>
        </p-button>
      </div>
    </form>
  `,
})
export class PlaylistRenameFormComponent {
  readonly name = input.required<string>();

  readonly save = output<string>();
  readonly cancelled = output<void>();

  /** Seeded from `name`, free to edit; re-seeds if the host swaps the name. */
  protected readonly draft = linkedSignal(() => this.name());

  protected submit(): void {
    const value = this.draft().trim();
    if (value) this.save.emit(value);
  }
}
