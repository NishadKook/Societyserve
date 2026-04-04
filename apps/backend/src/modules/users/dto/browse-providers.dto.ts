import { IsOptional, IsEnum, IsNumber, Min, Max, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory } from '@prisma/client';
import { Type } from 'class-transformer';

export class BrowseProvidersDto {
  @ApiPropertyOptional({ enum: ServiceCategory })
  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @ApiPropertyOptional({ description: 'Minimum average rating filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Maximum hourly rate filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: ['rating', 'price', 'experience'], description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: 'rating' | 'price' | 'experience';

  @ApiPropertyOptional({ description: 'Keyword search on provider name or bio' })
  @IsOptional()
  @IsString()
  search?: string;
}
