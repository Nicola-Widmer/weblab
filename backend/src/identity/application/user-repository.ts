import { User } from '../domain/user';
import { Uuid } from '../../shared/domain/uuid';

/** Port: how the application layer loads and stores users. */
export abstract class UserRepository {
  /** Insert or update by `id` (the Keycloak `sub`). */
  abstract save(user: User): Promise<void>;
  abstract byId(id: Uuid): Promise<User | undefined>;
}
