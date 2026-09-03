import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { SongDeleted } from '../../shared/contracts/song-deleted.event';
import { PlaylistsService } from './playlists.service';

/**
 * Keeps playlists consistent with the `songs` context: when a song is deleted,
 * drop it from every playlist.
 *
 * Runs fire-and-forget after the delete has committed (ADR-0002). If this throws
 * or the process dies mid-handle the song stays listed until the reconciliation
 * sweep repairs it — there is no automatic retry.
 */
@EventsHandler(SongDeleted)
export class RemoveDeletedSongFromPlaylists
  implements IEventHandler<SongDeleted>
{
  constructor(private readonly playlists: PlaylistsService) {}

  handle(event: SongDeleted): Promise<void> {
    return this.playlists.dropSongEverywhere(event.songId);
  }
}
