import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'tenant-uuid' })
  @IsString()
  tenantId: string;

  @ApiPropertyOptional({ enum: ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'], default: 'VIEWER' })
  @IsEnum(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'])
  @IsOptional()
  role?: string;
}
