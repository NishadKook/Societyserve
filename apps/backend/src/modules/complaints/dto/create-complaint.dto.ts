import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplaintType } from '@prisma/client';

export class CreateComplaintDto {
  @ApiProperty({ example: 'provider-profile-id' })
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @ApiProperty({
    enum: ComplaintType,
    description: 'SAFETY → routed to society admin. SERVICE/PAYMENT → routed to SocietyServe ops.',
  })
  @IsEnum(ComplaintType)
  type!: ComplaintType;

  @ApiProperty({ example: 'Provider did not show up for the scheduled visit' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ example: 'booking-id' })
  @IsOptional()
  @IsString()
  bookingId?: string;
}
