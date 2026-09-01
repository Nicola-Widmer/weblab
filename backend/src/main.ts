import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { buildOpenApiDocument, configureApp } from './setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  SwaggerModule.setup('api/docs', app, buildOpenApiDocument(app), {
    jsonDocumentUrl: 'api/openapi.json',
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API on http://localhost:${port} — docs /api/docs, spec /api/openapi.json`);
}

void bootstrap();
