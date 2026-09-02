import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { LOCAL_USER_ID } from '../../shared/domain/local-user';
import { asUuid } from '../../shared/domain/uuid';
import type { SongSort } from '../application/song-repository';
import { SongsService } from '../application/songs.service';
import type { Song } from '../domain/song';
import { SongDto, UpdateSongDto } from './dto/song.dto';

const SORTS: SongSort[] = ['title', 'artist', 'dateAdded'];

// AUTH_ENABLED=false: the fixed local user owns everything (ADR-0005). The real
// session guard resolves the owner per request and is out of scope here.
const owner = LOCAL_USER_ID;

// Upload (multipart), audio range-streaming and the cover endpoint are part of
// the "full HTTP surface" scope; the use cases exist on SongsService.
@Controller('songs')
export class SongsController {
  constructor(private readonly songs: SongsService) {}

  @Get()
  async list(@Query('sort') sort?: string): Promise<SongDto[]> {
    const chosen = SORTS.includes(sort as SongSort)
      ? (sort as SongSort)
      : 'dateAdded';
    return (await this.songs.list(owner, chosen)).map(toDto);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<SongDto> {
    return toDto(await this.songs.get(owner, asUuid(id)));
  }

  @Patch(':id')
  async retag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateSongDto,
  ): Promise<SongDto> {
    return toDto(await this.songs.editMetadata(owner, asUuid(id), body));
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.songs.remove(owner, asUuid(id));
  }
}

function toDto(song: Song): SongDto {
  return {
    id: song.id,
    ownerId: song.ownerId,
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    hasCover: song.coverArt !== undefined,
    addedAt: song.addedAt.toISOString(),
  };
}
