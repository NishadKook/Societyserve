import { IsString, IsInt, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSocietyDto {
  @ApiProperty({ example: 'Prestige Whitefield' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Whitefield Main Road, Whitefield' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: 'Bangalore' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: '560066' })
  @IsString()
  @IsNotEmpty()
  pincode!: string;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalUnits!: number;
}
