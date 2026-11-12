import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RegisterDto } from '../../auth/dto/register.dto.js';
import { PaginationQueryDto } from '../../common/pagination.js';
import { RoleName } from '../../generated/prisma/client.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// An admin creating a user supplies the same fields as registration, plus a role.
export class CreateUserDto extends RegisterDto {
  @ApiProperty({ enum: RoleName })
  @IsEnum(RoleName)
  role: RoleName;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  department?: string;
}

export class ChangeRoleDto extends PickType(CreateUserDto, ['role'] as const) {}

export class ChangeStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Matches name or email' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: RoleName })
  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  isActive?: boolean;
}
