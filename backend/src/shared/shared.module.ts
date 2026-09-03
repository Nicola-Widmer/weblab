import { Global, Module } from '@nestjs/common';
import { Clock } from './application/clock';
import { IdGenerator } from './application/id-generator';
import { RandomIdGenerator } from './infrastructure/random-id-generator';
import { SystemClock } from './infrastructure/system-clock';

/**
 * Cross-context primitives: the `Clock` and `IdGenerator` ports bound to their
 * default adapters. `@Global()` so every context can inject them without
 * importing this module explicitly.
 */
@Global()
@Module({
  providers: [
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: RandomIdGenerator },
  ],
  exports: [Clock, IdGenerator],
})
export class SharedModule {}
