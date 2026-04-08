import { IsString, MinLength, IsUUID, IsInt, Min, Max } from 'class-validator';

export class CreateBuildDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsUUID()
  projectId!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  @Min(2020)
  year!: number;
}
