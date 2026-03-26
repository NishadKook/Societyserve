import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReplyDto {
  @ApiProperty({ example: 'Thanks for the heads up!' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
