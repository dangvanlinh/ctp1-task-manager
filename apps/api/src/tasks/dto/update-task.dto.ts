import { IsString, MinLength, IsOptional, IsIn, IsUUID, IsInt, Min, Max, IsDateString } from 'class-validator';

export class UpdateTaskDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['TODO', 'IN_PROGRESS', 'DONE'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  @IsOptional()
  priority?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsInt()
  @Min(1)
  @Max(4)
  @IsOptional()
  week?: number;

  @IsUUID()
  @IsOptional()
  buildId?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;
}
