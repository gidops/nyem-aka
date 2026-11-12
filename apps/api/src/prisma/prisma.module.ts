import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// Global: every feature module needs the database, so they should not each have to import this.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
