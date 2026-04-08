import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateBuildDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;
}
