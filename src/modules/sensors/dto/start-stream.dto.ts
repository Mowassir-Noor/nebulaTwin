import { IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartStreamDto {
  @ApiProperty({
    enum: ['CONSTANT', 'LINEAR_INCREASE', 'LINEAR_DECREASE', 'SINE', 'RANDOM'],
    example: 'SINE',
  })
  @IsEnum(['CONSTANT', 'LINEAR_INCREASE', 'LINEAR_DECREASE', 'SINE', 'RANDOM'])
  pattern: string;

  @ApiProperty({ example: 1000, description: 'Interval in milliseconds' })
  @IsNumber()
  @Min(100)
  interval_ms: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  min: number;

  @ApiProperty({ example: 80 })
  @IsNumber()
  max: number;
}
