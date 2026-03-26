import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinSocietyDto {
  @ApiProperty({ example: 'clx1234...' })
  @IsUUID()
  societyId!: string;
}
