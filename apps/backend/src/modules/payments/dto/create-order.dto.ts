import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ description: 'ID of the completed booking' })
  @IsString()
  @IsNotEmpty()
  bookingId!: string;
}
