import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * A user of the music player. This is the custom type the endpoints return; the
 * OpenAPI schema for it is derived from these properties by the
 * `@nestjs/swagger` build plugin.
 */
export class UserDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsEmail()
  email!: string;
}

/** Fields accepted when replacing the current user. */
export class UpdateUserDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;
}
