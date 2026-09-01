import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';

/** Root module. One module per bounded context goes in `imports` (ADR-0002). */
@Module({
  imports: [UsersModule],
})
export class AppModule {}
