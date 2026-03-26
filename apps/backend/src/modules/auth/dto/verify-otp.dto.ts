import { IsString, Matches, Length, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class VerifyOtpDto {
  @ApiProperty({ example: '+919999000001' })
  @IsString()
  @Matches(/^\+91[6-9]\d{9}$/, { message: 'Phone must be a valid Indian mobile number' })
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp!: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.TENANT })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
