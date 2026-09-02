import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PlayerComponent } from './features/player/player.component';
import { SongListComponent } from './features/songs/song-list.component';
import { SongUploadComponent } from './features/songs/song-upload.component';

@Component({
  imports: [RouterOutlet, SongUploadComponent, SongListComponent, PlayerComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
