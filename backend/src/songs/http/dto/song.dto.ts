import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

/** A track in the library. Storage keys are never exposed. */
export class SongDto {
  @IsString()
  id!: string;

  @IsString()
  ownerId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  album?: string;

  @IsInt()
  duration!: number;

  hasCover!: boolean;

  @IsString()
  addedAt!: string;
}

/** Fields accepted when retagging a song. Duration and the audio never change. */
export class UpdateSongDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  album?: string;
}
