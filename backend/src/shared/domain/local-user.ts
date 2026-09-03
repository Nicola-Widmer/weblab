import { asUuid } from './uuid';

/**
 * The implicit owner used when `AUTH_ENABLED=false` (ADR-0005): one local user
 * owns everything. `identity` seeds this user; `songs` / `playlists` controllers
 * use it in place of the session guard, which is out of scope here.
 */
export const LOCAL_USER_ID = asUuid('9f1b2c3d-0000-4000-8000-000000000001');
