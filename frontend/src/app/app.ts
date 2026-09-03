import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideDisc3 } from '@lucide/angular';
import { PlayerComponent } from './features/player/player.component';

@Component({
  imports: [RouterOutlet, PlayerComponent, TranslatePipe, LucideDisc3],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
