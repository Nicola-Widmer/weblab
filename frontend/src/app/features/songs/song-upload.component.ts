import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { injectMutation, QueryClient } from '@tanstack/angular-query-experimental';
import { LucideUpload } from '@lucide/angular';
import { Button } from '@openng/optimus-ui/button';
import {
  songsControllerListQueryKey,
  songsControllerUploadMutation,
} from '../../api/@tanstack/angular-query-experimental.gen';

/** Only .mp3 is accepted; the browser reports this MIME for them. */
const ACCEPTED_TYPE = 'audio/mpeg';

/**
 * Upload shell around the song list: an explicit "Add songs" button plus a
 * drop zone that spans the whole projected table. Dragging files anywhere over
 * the list shows an overlay; dropping (or picking) queues each .mp3 through the
 * upload mutation and refreshes the library once the batch settles.
 */
@Component({
  selector: 'app-song-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, Button, LucideUpload],
  template: `
    <div
      class="relative"
      (dragenter)="onDragEnter($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave()"
      (drop)="onDrop($event)"
    >
      <div class="mb-3 flex items-center justify-between gap-3">
        <p class="text-sm text-surface-500 dark:text-surface-400">
          {{ 'songs.upload.hint' | translate }}
        </p>
        <p-button size="small" [disabled]="pending() > 0" (onClick)="picker.click()">
          <svg lucideUpload class="mr-2 size-4"></svg>
          {{ 'songs.upload.button' | translate }}
        </p-button>
      </div>

      <ng-content />

      @if (dragging()) {
        <div
          class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary-500 bg-primary-500/10 text-primary-700 backdrop-blur-sm dark:text-primary-300"
        >
          <span class="text-lg font-semibold">{{ 'songs.upload.drop' | translate }}</span>
        </div>
      }

      <input
        #picker
        type="file"
        accept="audio/mpeg,.mp3"
        multiple
        hidden
        (change)="onPick($event)"
      />
    </div>

    @if (pending() > 0) {
      <p class="mt-2 text-sm text-surface-500 dark:text-surface-400">
        {{ 'songs.upload.uploading' | translate: { count: pending() } }}
      </p>
    }
    @if (rejected() > 0) {
      <p class="mt-2 text-sm text-red-600 dark:text-red-400">
        {{ 'songs.upload.rejected' | translate: { count: rejected() } }}
      </p>
    }
    @if (failed() > 0) {
      <p class="mt-2 text-sm text-red-600 dark:text-red-400">
        {{ 'songs.upload.failed' | translate: { count: failed() } }}
      </p>
    }
  `,
})
export class SongUploadComponent {
  private readonly queryClient = inject(QueryClient);
  private readonly mutation = injectMutation(() => songsControllerUploadMutation());

  /** Overlay is shown while files are dragged over the list. */
  protected readonly dragging = signal(false);
  /** Uploads still in flight in the current batch. */
  protected readonly pending = signal(0);
  /** Non-mp3 files skipped in the last drop/pick. */
  protected readonly rejected = signal(0);
  /** Uploads that errored in the current batch. */
  protected readonly failed = signal(0);

  /** dragenter/dragleave fire per child element; count depth to stay stable. */
  private dragDepth = 0;

  onDragEnter(event: DragEvent): void {
    if (!hasFiles(event)) return;
    event.preventDefault();
    this.dragDepth++;
    this.dragging.set(true);
  }

  onDragOver(event: DragEvent): void {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  onDragLeave(): void {
    if (--this.dragDepth <= 0) {
      this.dragDepth = 0;
      this.dragging.set(false);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragDepth = 0;
    this.dragging.set(false);
    this.add(event.dataTransfer?.files);
  }

  onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.add(input.files);
    input.value = '';
  }

  private add(list: FileList | null | undefined): void {
    if (!list?.length) return;
    const files = Array.from(list);
    const accepted = files.filter(
      (file) => file.type === ACCEPTED_TYPE || file.name.toLowerCase().endsWith('.mp3'),
    );
    this.rejected.set(files.length - accepted.length);
    this.failed.set(0);
    for (const file of accepted) this.upload(file);
  }

  private upload(file: File): void {
    this.pending.update((n) => n + 1);
    this.mutation.mutate(
      { body: { file } },
      {
        onError: () => this.failed.update((n) => n + 1),
        onSettled: () => {
          this.pending.update((n) => n - 1);
          if (this.pending() === 0) {
            void this.queryClient.invalidateQueries({
              queryKey: songsControllerListQueryKey(),
            });
          }
        },
      },
    );
  }
}

/** True when the drag payload carries files (not just text/links). */
function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false;
}
