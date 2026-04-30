import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OverrideSensorDto {
  @ApiPropertyOptional({ example: 'manual', description: 'Deprecated, always sets MANUAL mode' })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiProperty({ example: 55.2 })
  @IsNumber()
  value: number;
}
