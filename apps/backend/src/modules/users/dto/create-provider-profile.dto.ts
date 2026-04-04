import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateProviderProfileDto {
  @ApiProperty({ example: 'Priya Devi' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ enum: ServiceCategory, example: ServiceCategory.MAID })
  @IsEnum(ServiceCategory)
  serviceCategory!: ServiceCategory;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  hourlyRate!: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  experienceYears?: number;

  @ApiPropertyOptional({ example: 'Experienced maid with 3 years in Whitefield' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 'https://r2.example.com/id-proofs/aadhaar.jpg' })
  @IsOptional()
  @IsString()
  idProofUrl?: string;

  @ApiPropertyOptional({ example: 'priya@okaxis' })
  @IsOptional()
  @IsString()
  upiId?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({ example: 'SBIN0001234' })
  @IsOptional()
  @IsString()
  bankIfsc?: string;
}
