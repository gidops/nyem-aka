import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class QueryAuditLogsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'ServiceRequest' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  entity?: string;

  @ApiPropertyOptional({ description: 'Id of the affected record' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityId?: string;

  @ApiPropertyOptional({ description: 'Id of the user who acted' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  actorId?: string;

  @ApiPropertyOptional({
    example: 'request.',
    description: 'Action or prefix: "auth." matches auth.login, auth.logout, …',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  action?: string;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-30T23:59:59Z' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
