import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Deliberately has no role field: self-registration always creates a REQUESTER.
export class RegisterDto {
  @ApiProperty({ example: 'ada@university.edu' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, example: 'a-long-passphrase' })
  @IsString()
  @MinLength(8)
  @MaxLength(128) // an upper bound stops someone sending megabytes to the hasher
  password: string;

  @ApiProperty({ example: 'Ada Okafor' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ example: 'Computer Science' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  department?: string;
}
