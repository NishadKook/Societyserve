import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveComplaintDto {
  @ApiProperty({ example: 'Refund issued and provider warned.' })
  @IsString()
  @IsNotEmpty()
  resolution!: string;
}
