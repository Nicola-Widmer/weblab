import { Uuid } from '../domain/uuid';

/** Port: mints a fresh `Uuid` for a new entity id or session token. */
export abstract class IdGenerator {
  abstract next(): Uuid;
}
