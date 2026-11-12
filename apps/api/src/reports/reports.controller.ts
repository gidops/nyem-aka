import { Controller, Get, Ip, Query, Res } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { QueryRequestsDto } from '../requests/dto/requests.dto.js';
import { ReportRangeDto } from './reports.dto.js';
import { ReportsService } from './reports.service.js';

@ApiTags('reports')
@ApiCookieAuth()
@Roles('ADMIN')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Counts by status, priority and category, and average completion time' })
  summary(@Query() range: ReportRangeDto) {
    return this.reports.summary(range);
  }

  @Get('requests.csv')
  @ApiOperation({
    summary: 'Download requests as CSV',
    description: 'Accepts the same filters as GET /requests (page and limit are ignored).',
  })
  @ApiProduces('text/csv')
  async requestsCsv(
    @Query() query: QueryRequestsDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.reports.requestsCsv(query, actor, ip);
    const date = new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      // "attachment" makes the browser save the file instead of displaying it.
      'Content-Disposition': `attachment; filename="nyem-aka-requests-${date}.csv"`,
    });
    return csv;
  }
}
