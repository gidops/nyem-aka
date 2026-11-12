import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service.js';

// Global for the same reason as PrismaModule: every feature writes audit entries.
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
