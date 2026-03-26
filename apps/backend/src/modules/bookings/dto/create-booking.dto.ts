import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingType } from '@prisma/client';

export class CreateBookingDto {
  @ApiProperty({ example: 'provider-profile-id' })
  @IsString()
  providerId!: string;

  @ApiProperty({ example: 'service-id' })
  @IsString()
  serviceId!: string;

  @ApiProperty({ enum: BookingType, example: BookingType.ONE_TIME })
  @IsEnum(BookingType)
  bookingType!: BookingType;

  @ApiProperty({ example: '2026-03-12T09:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ example: 'Please bring cleaning supplies' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Required for RECURRING bookings',
    example: { frequency: 'daily', daysOfWeek: [1, 2, 3, 4, 5] },
  })
  @IsOptional()
  @IsObject()
  recurrenceRule?: Record<string, unknown>;
}
