import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  // 4000 locally so the API never collides with Next.js on 3000.
  // Render injects its own PORT in production.
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
