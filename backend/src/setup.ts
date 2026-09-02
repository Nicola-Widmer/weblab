import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** App configuration shared by the server, the spec generator, and the tests. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not on the DTO
      forbidNonWhitelisted: true, // 400 if the body has extra properties
      transform: true, // hand controllers real DTO instances
    }),
  );
}

/** Build the OpenAPI document by reflecting over the controllers and DTOs. */
export function buildOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Web Music Player API')
    .setVersion('0.1.0')
    .addServer('/api')
    .build();
  // Paths stay bare (e.g. `/songs`, not `/api/songs`); the `/api` prefix lives in
  // the server URL so the generated frontend client's paths line up with its
  // `/api` baseUrl.
  return SwaggerModule.createDocument(app, config, { ignoreGlobalPrefix: true });
}
