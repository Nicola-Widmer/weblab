import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { buildOpenApiDocument, configureApp } from './setup';

// Writes backend/openapi.json — committed, and consumed by the frontend codegen.
async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);
  writeFileSync('openapi.json', `${JSON.stringify(buildOpenApiDocument(app), null, 2)}\n`);
  await app.close();
  console.log('Wrote openapi.json');
}

void main();
