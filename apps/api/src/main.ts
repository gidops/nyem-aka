import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 4000 locally so the API never collides with Next.js on 3000.
  // Render injects its own PORT in production.
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
