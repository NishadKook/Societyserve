import { IsString, IsEnum, IsNumber, IsOptional, IsInt, Min, MaxLength, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @ApiProperty({ enum: ServiceCategory })
  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @ApiProperty({ example: 'Daily House Cleaning' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 299 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price!: number;

  @ApiPropertyOptional({ example: 8000, description: 'Monthly subscription price for recurring categories' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  monthlyPrice?: number;

  @ApiPropertyOptional({ example: 300, description: 'One-day paid trial price for recurring categories' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  trialPrice?: number;

  @ApiPropertyOptional({ example: { daysPerWeek: 6, timeSlot: '07:00-08:00' }, description: 'Schedule details for recurring services' })
  @IsObject()
  @IsOptional()
  schedule?: Record<string, any>;

  @ApiProperty({ example: 60 })
  @IsInt()
  @Min(15)
  @Type(() => Number)
  durationMinutes!: number;
}
