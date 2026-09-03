import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PlayerComponent } from './features/player/player.component';

@Component({
  imports: [RouterOutlet, PlayerComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
