import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class ReportRangeDto {
  @ApiPropertyOptional({ example: '2026-11-01', description: 'Requests created on or after' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-30', description: 'Requests created on or before' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
