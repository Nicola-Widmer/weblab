import { Component, inject } from '@angular/core';
import { PlayerService } from './player.service';

@Component({
  selector: 'app-player',
  template: `
    @let song = player.current();
    @if (song) {
      <footer>
        <strong>{{ song.title }}</strong>
        @if (song.artist) {
          <span> — {{ song.artist }}</span>
        }
        <audio
          #audio
          [src]="player.audioUrl()"
          controls
          autoplay
          (ended)="player.next()"
          (loadeddata)="audio.play()"
        ></audio>
      </footer>
    }
  `,
})
export class PlayerComponent {
  protected readonly player = inject(PlayerService);
}
