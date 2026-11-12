import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

// Base class for every "list" query. Feature DTOs extend it and add their own filters.
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number) // query strings arrive as text; convert before validating
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // a cap stops one request from asking for the whole table
  limit: number = 10;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function paginated<T>(
  data: T[],
  total: number,
  query: PaginationQueryDto,
): Paginated<T> {
  return {
    data,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}
