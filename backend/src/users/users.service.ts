import { Injectable } from '@nestjs/common';
import { UpdateUserDto, UserDto } from './dto/user.dto';

/**
 * Stand-in for a real repository. Injected into the controller; swap it for a
 * database-backed adapter later without touching the controller (ADR-0002).
 */
@Injectable()
export class UsersService {
  private user: UserDto = {
    id: 'local',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
  };

  get(): UserDto {
    return this.user;
  }

  replace(data: UpdateUserDto): UserDto {
    this.user = { id: this.user.id, name: data.name, email: data.email };
    return this.user;
  }
}
