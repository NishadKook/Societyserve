import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory } from '@prisma/client';

export class CreateJobRequestDto {
  @ApiProperty({ enum: ServiceCategory })
  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @ApiProperty({ example: 'Need an electrician to fix a ceiling fan and one plug point' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    example: 'today_morning',
    description: 'today_morning | today_evening | tomorrow_morning | tomorrow_evening',
  })
  @IsString()
  @IsNotEmpty()
  timePreference!: string;

  @ApiPropertyOptional({ example: 'https://r2.societyserve.in/photos/fan.jpg' })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}
