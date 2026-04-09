import { IsString, MinLength, IsUUID, IsInt, Min, Max, IsOptional, IsDateString, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMilestoneDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsDateString()
  date!: string;

  @IsString()
  @IsIn(['BUILD', 'REVIEW', 'SENDOUT', 'LIVE'])
  @IsOptional()
  type?: string;
}

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

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  liveDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  assigneeIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneDto)
  @IsOptional()
  milestones?: CreateMilestoneDto[];
}
