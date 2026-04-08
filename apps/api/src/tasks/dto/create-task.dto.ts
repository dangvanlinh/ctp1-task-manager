import { IsString, MinLength, IsOptional, IsIn, IsUUID, IsInt, Min, Max, IsDateString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  @IsOptional()
  priority?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsInt()
  @Min(1)
  @Max(4)
  week!: number;

  @IsUUID()
  buildId!: string;

  @IsUUID()
  assigneeId!: string;

  @IsUUID()
  projectId!: string;
}
