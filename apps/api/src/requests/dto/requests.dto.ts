import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { Priority, RequestStatus } from '../../generated/prisma/client.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateRequestDto {
  @ApiProperty({ example: 'Leaking tap in Lab 2' })
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'The cold tap at the back sink drips constantly and the floor is wet.' })
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiProperty({ example: 'Science Block, Lab 2' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  location: string;

  @ApiProperty({ example: 2, description: 'From GET /categories' })
  @IsInt()
  categoryId: number;

  @ApiPropertyOptional({ enum: Priority, default: Priority.MEDIUM })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}

export class UpdateRequestDto extends PartialType(CreateRequestDto) {}

export const REQUEST_GROUPS = ['open', 'closed'] as const;
export type RequestGroup = (typeof REQUEST_GROUPS)[number];

export const REQUEST_SORTS = ['newest', 'oldest', 'priority'] as const;
export type RequestSort = (typeof REQUEST_SORTS)[number];

export class QueryRequestsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Searches title, description and location, or a reference such as NA-000042',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: RequestStatus })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @ApiPropertyOptional({
    enum: REQUEST_GROUPS,
    description: 'open = pending, assigned or in progress; closed = completed, rejected or cancelled',
  })
  @IsOptional()
  @IsIn(REQUEST_GROUPS)
  group?: RequestGroup;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ example: '2026-11-01', description: 'Created on or after this date' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-11-30',
    description: 'Created on or before this date (a date without a time includes the whole day)',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ enum: REQUEST_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(REQUEST_SORTS)
  sort: RequestSort = 'newest';
}

export class AssignRequestDto {
  @ApiProperty({ description: 'Id of an active user with the OFFICER role' })
  @IsString()
  @MinLength(1)
  officerId: string;

  @ApiPropertyOptional({ example: 'Please attend before Friday' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ChangeStatusDto {
  @ApiProperty({
    enum: RequestStatus,
    description: 'IN_PROGRESS or COMPLETED (assigned officer); REJECTED or reopening to IN_PROGRESS (admin)',
  })
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @ApiPropertyOptional({ description: 'Required when rejecting or reopening' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}
