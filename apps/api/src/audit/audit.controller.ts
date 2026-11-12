import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { QueryAuditLogsDto } from './audit.dto.js';
import { AuditService } from './audit.service.js';

// Read-only on purpose: there is no route to edit or delete an audit entry.
@ApiTags('audit')
@ApiCookieAuth()
@Roles('ADMIN')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'The audit trail, newest first' })
  list(@Query() query: QueryAuditLogsDto) {
    return this.audit.list(query);
  }
}
