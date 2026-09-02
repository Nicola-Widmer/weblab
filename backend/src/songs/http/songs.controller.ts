import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiProduces,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { LOCAL_USER_ID } from '../../shared/domain/local-user';
import { asUuid } from '../../shared/domain/uuid';
import type { ByteRange } from '../application/file-storage';
import type { SongSort } from '../application/song-repository';
import {
  MAX_UPLOAD_BYTES,
  SongsService,
  type StreamedFile,
} from '../application/songs.service';
import type { Song } from '../domain/song';
import { SongDto, UpdateSongDto } from './dto/song.dto';

const SORTS: SongSort[] = ['title', 'artist', 'dateAdded'];

// AUTH_ENABLED=false: the fixed local user owns everything (ADR-0005). The real
// session guard resolves the owner per request and is out of scope here.
const owner = LOCAL_USER_ID;

/** The fields multer's in-memory storage puts on an uploaded file. */
interface MultipartFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

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

  /** Upload an .mp3. Metadata comes from the file's ID3 tags; edit later via PATCH. */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async upload(@UploadedFile() file?: MultipartFile): Promise<SongDto> {
    if (!file) throw new BadRequestException('An mp3 `file` part is required');
    return toDto(
      await this.songs.upload(owner, {
        filename: file.originalname,
        mimeType: file.mimetype,
        bytes: file.buffer,
      }),
    );
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

  /** Audio bytes with HTTP Range support — `206` when a range is asked for (SNG-2, PB-1). */
  @Get(':id/audio')
  @ApiProduces('audio/mpeg')
  @ApiOkResponse({
    description: 'Full (200) or partial (206) audio stream',
    content: { 'audio/mpeg': { schema: { type: 'string', format: 'binary' } } },
  })
  async audio(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('range') rangeHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const range = parseRange(rangeHeader);
    const file = await this.songs.streamAudio(owner, asUuid(id), range);

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Length', file.contentLength);
    if (range) {
      const end = range.start + file.contentLength - 1;
      res.setHeader(
        'Content-Range',
        `bytes ${range.start}-${end}/${file.totalSize}`,
      );
      res.status(206);
    }
    pipe(file, res);
  }

  /** Cover image. Small and immutable for a given song, so cache it hard. */
  @Get(':id/cover')
  @ApiProduces('image/jpeg', 'image/png')
  @ApiOkResponse({
    description: 'Cover image bytes',
    content: {
      'image/jpeg': { schema: { type: 'string', format: 'binary' } },
      'image/png': { schema: { type: 'string', format: 'binary' } },
    },
  })
  async cover(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.songs.getCover(owner, asUuid(id));
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Length', file.totalSize);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    pipe(file, res);
  }
}

/**
 * Parse a single `bytes=start-` or `bytes=start-end` header. Suffix ranges
 * (`bytes=-N`), multi-ranges and anything malformed return `undefined`, so the
 * caller falls back to a full `200` response.
 */
function parseRange(header: string | undefined): ByteRange | undefined {
  if (!header) return undefined;
  const match = /^bytes=(\d+)-(\d*)$/.exec(header.trim());
  if (!match) return undefined;
  const start = Number(match[1]);
  const end = match[2] === '' ? undefined : Number(match[2]);
  if (end !== undefined && end < start) return undefined;
  return { start, end };
}

function pipe(file: StreamedFile, res: Response): void {
  file.stream.on('error', () => res.destroy());
  file.stream.pipe(res);
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
