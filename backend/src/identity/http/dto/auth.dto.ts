import { IsEmail, IsString } from 'class-validator';

/** A user, as returned by the API. */
export class UserDto {
  @IsString()
  id!: string;

  @IsEmail()
  email!: string;

  @IsString()
  createdAt!: string;
}
