import { Routes } from '@angular/router';
import { SongsPageComponent } from './features/songs/songs-page.component';
import { PlaylistsPageComponent } from './features/playlists/playlists-page.component';
import { PlaylistDetailComponent } from './features/playlists/playlist-detail.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'songs' },
  { path: 'songs', component: SongsPageComponent },
  { path: 'playlists', component: PlaylistsPageComponent },
  { path: 'playlists/:id', component: PlaylistDetailComponent },
];
