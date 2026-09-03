import { Uuid } from '../domain/uuid';
import { DomainEvent } from '../events/domain-event';

/**
 * A song was permanently removed from the `songs` context.
 *
 * Any context that references songs — `playlists` drops it from every playlist,
 * playback stops if it is the current track — subscribes to this. By the time a
 * handler runs the delete has already committed; a handler failure does not roll
 * it back (ADR-0002), a reconciliation sweep is the backstop.
 */
export class SongDeleted extends DomainEvent {
  constructor(
    readonly songId: Uuid,
    readonly ownerId: Uuid,
  ) {
    super();
  }
}
