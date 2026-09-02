import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { IdentityModule } from './identity/identity.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { DatabaseModule } from './shared/db/database.module';
import { SharedModule } from './shared/shared.module';
import { SongsModule } from './songs/songs.module';

/**
 * Root module. `SharedModule` provides the cross-context primitives (`Clock`,
 * `IdGenerator`); `DatabaseModule` the Postgres connection (used by `songs` so
 * far). One feature-folder module per bounded context follows (ADR-0002).
 * `CqrsModule.forRoot()` registers the app-wide `EventBus`; contexts publish and
 * subscribe through it without importing each other.
 */
@Module({
  imports: [
    CqrsModule.forRoot(),
    SharedModule,
    DatabaseModule,
    IdentityModule,
    SongsModule,
    PlaylistsModule,
  ],
})
export class AppModule {}
