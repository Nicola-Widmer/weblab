import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { injectMutation, QueryClient } from '@tanstack/angular-query-experimental';
import {
  songsControllerListQueryKey,
  songsControllerUploadMutation,
} from '../../api/@tanstack/angular-query-experimental.gen';

@Component({
  selector: 'app-song-upload',
  imports: [TranslatePipe],
  template: `
    <input
      type="file"
      accept="audio/mpeg,.mp3"
      (change)="upload($event)"
      [disabled]="mutation.isPending()"
    />
    @if (mutation.isError()) {
      <span> {{ 'songs.upload.failed' | translate }}</span>
    }
  `,
})
export class SongUploadComponent {
  private readonly queryClient = inject(QueryClient);
  protected readonly mutation = injectMutation(() => ({
    ...songsControllerUploadMutation(),
    onSuccess: () =>
      this.queryClient.invalidateQueries({
        queryKey: songsControllerListQueryKey(),
      }),
  }));

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.mutation.mutate({ body: { file } });
    input.value = '';
  }
}
