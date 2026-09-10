import { Controller, Get } from '@nestjs/common';
import { Uuid } from '../../shared/domain/uuid';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import { AuthService } from '../application/auth.service';
import type { User } from '../domain/user';
import { UserDto } from './dto/auth.dto';

/**
 * `GET /auth/me` reports the current user, resolved by the global auth guard —
 * the BFF cookie under `AUTH_ENABLED=true`, the fixed local user otherwise.
 * Login and logout are `OidcController`.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  async me(@CurrentUser() userId: Uuid): Promise<UserDto> {
    return toDto(await this.auth.userById(userId));
  }
}

function toDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email.value,
    createdAt: user.createdAt.toISOString(),
  };
}
