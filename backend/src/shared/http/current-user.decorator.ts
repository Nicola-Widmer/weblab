import {
  createParamDecorator,
  type ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Uuid } from '../domain/uuid';

/** What the auth guard attaches to the request. */
export interface AuthedRequestUser {
  id: Uuid;
}

/**
 * The authenticated user's id (its `ownerId` for data-access scoping). Populated
 * by the global auth guard — with `AUTH_ENABLED=false` that is the fixed local
 * user. A route reachable without the guard having run is a wiring bug, hence
 * the 500 rather than a silent `undefined`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Uuid => {
    const req = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthedRequestUser }>();
    if (!req.user) {
      throw new InternalServerErrorException(
        'CurrentUser read on a route the auth guard did not process',
      );
    }
    return req.user.id;
  },
);
