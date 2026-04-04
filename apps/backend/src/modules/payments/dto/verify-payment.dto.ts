import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Razorpay order ID returned during order creation' })
  @IsString()
  @IsNotEmpty()
  razorpayOrderId!: string;

  @ApiProperty({ description: 'Razorpay payment ID from checkout callback' })
  @IsString()
  @IsNotEmpty()
  razorpayPaymentId!: string;

  @ApiProperty({ description: 'Razorpay signature from checkout callback' })
  @IsString()
  @IsNotEmpty()
  razorpaySignature!: string;
}
