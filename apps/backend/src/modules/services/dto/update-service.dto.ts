import { IsString, IsNumber, IsOptional, IsInt, Min, MaxLength, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateServiceDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @ApiProperty({ required: false, description: 'Monthly subscription price for recurring categories' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  monthlyPrice?: number;

  @ApiProperty({ required: false, description: 'One-day paid trial price for recurring categories' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  trialPrice?: number;

  @ApiProperty({ required: false, description: 'Schedule details for recurring services' })
  @IsObject()
  @IsOptional()
  schedule?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  @Min(15)
  @Type(() => Number)
  durationMinutes?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
