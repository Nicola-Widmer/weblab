import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { IdGenerator } from '../application/id-generator';
import { Uuid } from '../domain/uuid';

@Injectable()
export class RandomIdGenerator extends IdGenerator {
  next(): Uuid {
    return randomUUID() as Uuid;
  }
}
