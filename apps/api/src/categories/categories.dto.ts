import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electrical' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({ example: 'Lighting, sockets, power faults' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  description?: string;
}

// PartialType copies the fields and their validation, but makes each one optional.
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional({ description: 'Inactive categories cannot be chosen for new requests' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
