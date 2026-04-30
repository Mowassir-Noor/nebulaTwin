import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSensorDto {
  @ApiProperty({ example: 'Temperature Sensor' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'temperature' })
  @IsString()
  type: string;

  @ApiProperty({ example: '°C' })
  @IsString()
  unit: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  modelPartId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assetId?: string;
}
