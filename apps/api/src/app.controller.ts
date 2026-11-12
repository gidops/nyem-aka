import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator.js';
import { PrismaService } from './prisma/prisma.service.js';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  // Health probe: used by Render's health check and by us to confirm the API is up.
  // Returns 503 when the database is unreachable, so a deploy that cannot reach
  // its database is reported as unhealthy rather than "ok".
  @Public()
  @Get('health')
  async health() {
    const timestamp = new Date().toISOString();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
        timestamp,
      });
    }
    return { status: 'ok', database: 'connected', timestamp };
  }
}
