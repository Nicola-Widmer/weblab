import { Body, Controller, Get, Put } from '@nestjs/common';
import { UpdateUserDto, UserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@Controller('user')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** The current user. */
  @Get()
  getUser(): UserDto {
    return this.users.get();
  }

  /** Replace the current user and return the stored record. */
  @Put()
  replaceUser(@Body() body: UpdateUserDto): UserDto {
    return this.users.replace(body);
  }
}
