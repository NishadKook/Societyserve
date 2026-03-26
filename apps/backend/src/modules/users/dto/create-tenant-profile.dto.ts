import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantProfileDto {
  @ApiProperty({ example: 'A-101' })
  @IsString()
  @IsNotEmpty()
  flatNumber!: string;

  @ApiProperty({ example: 'Rahul Sharma' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: 'clx1234...' })
  @IsUUID()
  societyId!: string;
}
