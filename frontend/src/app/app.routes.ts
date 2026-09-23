import { Routes } from '@angular/router';

// Lazy-loaded (pages are default exports) so each ships in its own chunk.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'songs' },
  { path: 'songs', loadComponent: () => import('./features/songs/songs-page.component') },
  {
    path: 'playlists',
    loadComponent: () => import('./features/playlists/playlists-page.component'),
  },
  {
    path: 'playlists/:id',
    loadComponent: () => import('./features/playlists/playlist-detail.component'),
  },
];