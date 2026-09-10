import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'wmp:isPublic';

/**
 * Marks a route as reachable without authentication — the global auth guard
 * skips it and attaches no user. Use for the OIDC login/callback/logout
 * endpoints, which run before a session exists.
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
