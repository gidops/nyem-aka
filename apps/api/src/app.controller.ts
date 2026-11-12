import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  // Liveness probe: used by Render's health check and by us to confirm the API is up.
  // Phase 1 extends this to report whether the database is reachable.
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
