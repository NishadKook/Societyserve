import { IsNumber, IsPositive, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SubmitBidDto {
  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price!: number;

  @ApiProperty({ example: 60, description: 'Estimated time in minutes' })
  @Type(() => Number)
  @IsInt()
  @Min(15)
  estimatedMinutes!: number;

  @ApiPropertyOptional({ example: 'I have all required tools and can start immediately' })
  @IsOptional()
  @IsString()
  message?: string;
}
