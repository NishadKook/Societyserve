import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DevicePlatformDto {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
  WEB = 'WEB',
}

export class RegisterDeviceDto {
  @ApiProperty({ example: 'fcm-token-string' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ enum: DevicePlatformDto, example: 'IOS' })
  @IsEnum(DevicePlatformDto)
  platform!: DevicePlatformDto;
}

export class RemoveDeviceDto {
  @ApiProperty({ example: 'fcm-token-string' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
