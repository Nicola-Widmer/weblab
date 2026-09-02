import { Uuid } from '../../shared/domain/uuid';

/**
 * One occurrence of a song in a playlist. An entity local to the `Playlist`
 * aggregate: it has its own `id` (what add / remove / reorder address), and the
 * same `songId` may appear in several entries. `position` is maintained by the
 * aggregate, contiguous `0 … n-1`.
 */
export class PlaylistEntry {
  constructor(
    readonly id: Uuid,
    readonly songId: Uuid,
    public position: number,
  ) {}
}
