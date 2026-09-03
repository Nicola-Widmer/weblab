import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

/** One occurrence of a song in a playlist. */
export class PlaylistEntryDto {
  @IsString()
  id!: string;

  @IsString()
  songId!: string;

  @IsInt()
  position!: number;
}

/** A playlist with its ordered entries. */
export class PlaylistDto {
  @IsString()
  id!: string;

  @IsString()
  ownerId!: string;

  @IsString()
  name!: string;

  entries!: PlaylistEntryDto[];

  @IsInt()
  trackCount!: number;
}

export class CreatePlaylistDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

export class RenamePlaylistDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

export class AddEntryDto {
  @IsUUID()
  songId!: string;
}

export class ReorderEntriesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  entryIds!: string[];
}
