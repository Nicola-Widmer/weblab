import 'reflect-metadata';
// Load backend/.env before anything reads process.env (some modules do so at
// import time). No-ops when the file is absent — e.g. in the container, where
// Compose provides the vars. Real env vars (mprocs, Compose) always win.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { Db } from './shared/db/client';
import { DB } from './shared/db/database.module';
import { runMigrations } from './shared/db/migrate';
import { buildOpenApiDocument, configureApp } from './setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks(); // so DatabaseModule closes the pool on SIGTERM

  const db = app.get<Db | null>(DB);
  if (db) await runMigrations(db);

  SwaggerModule.setup('api/docs', app, buildOpenApiDocument(app), {
    jsonDocumentUrl: 'api/openapi.json',
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API on http://localhost:${port} — docs /api/docs, spec /api/openapi.json`);
}

void bootstrap();
