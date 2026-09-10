import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { asUuid, type Uuid } from '../../shared/domain/uuid';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import { PlaylistsService } from '../application/playlists.service';
import type { Playlist } from '../domain/playlist';
import {
  AddEntryDto,
  CreatePlaylistDto,
  PlaylistDto,
  RenamePlaylistDto,
  ReorderEntriesDto,
} from './dto/playlist.dto';

@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlists: PlaylistsService) {}

  @Get()
  async list(@CurrentUser() owner: Uuid): Promise<PlaylistDto[]> {
    return (await this.playlists.list(owner)).map(toDto);
  }

  @Post()
  async create(
    @CurrentUser() owner: Uuid,
    @Body() body: CreatePlaylistDto,
  ): Promise<PlaylistDto> {
    return toDto(await this.playlists.create(owner, body.name));
  }

  @Get(':id')
  async get(
    @CurrentUser() owner: Uuid,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlaylistDto> {
    return toDto(await this.playlists.get(owner, asUuid(id)));
  }

  @Patch(':id')
  async rename(
    @CurrentUser() owner: Uuid,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RenamePlaylistDto,
  ): Promise<PlaylistDto> {
    return toDto(await this.playlists.rename(owner, asUuid(id), body.name));
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() owner: Uuid,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.playlists.remove(owner, asUuid(id));
  }

  @Post(':id/entries')
  async addEntry(
    @CurrentUser() owner: Uuid,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddEntryDto,
  ): Promise<PlaylistDto> {
    return toDto(
      await this.playlists.addSong(owner, asUuid(id), asUuid(body.songId)),
    );
  }

  @Delete(':id/entries/:entryId')
  @HttpCode(204)
  removeEntry(
    @CurrentUser() owner: Uuid,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ): Promise<void> {
    return this.playlists
      .removeEntry(owner, asUuid(id), asUuid(entryId))
      .then(() => undefined);
  }

  @Put(':id/entries')
  async reorder(
    @CurrentUser() owner: Uuid,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReorderEntriesDto,
  ): Promise<PlaylistDto> {
    return toDto(
      await this.playlists.reorder(
        owner,
        asUuid(id),
        body.entryIds.map(asUuid),
      ),
    );
  }
}

function toDto(playlist: Playlist): PlaylistDto {
  return {
    id: playlist.id,
    ownerId: playlist.ownerId,
    name: playlist.name,
    entries: playlist.entries.map((e) => ({
      id: e.id,
      songId: e.songId,
      position: e.position,
    })),
    trackCount: playlist.entries.length,
    createdAt: playlist.createdAt.toISOString(),
  };
}
