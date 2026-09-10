import { Session } from '../domain/session';
import { Uuid } from '../../shared/domain/uuid';

/** Port: how the application layer loads and stores sessions. */
export abstract class SessionRepository {
  abstract save(session: Session): Promise<void>;
  abstract byId(id: Uuid): Promise<Session | undefined>;
  abstract deleteById(id: Uuid): Promise<void>;
  abstract deleteExpired(now: Date): Promise<void>;
}
