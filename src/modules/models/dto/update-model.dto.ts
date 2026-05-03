import { IsString, IsOptional } from 'class-validator';

export class UpdateModelDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
