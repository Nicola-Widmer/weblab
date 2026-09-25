import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ConfirmDialog } from '@openng/optimus-ui/confirmdialog';
import { LucideDisc3, LucideListMusic, LucideMusic } from '@lucide/angular';
import { PlayerComponent } from './features/player/player.component';
import { UserMenuComponent } from './auth/user-menu.component';

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    PlayerComponent,
    UserMenuComponent,
    TranslatePipe,
    ConfirmDialog,
    LucideDisc3,
    LucideMusic,
    LucideListMusic,
  ],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
