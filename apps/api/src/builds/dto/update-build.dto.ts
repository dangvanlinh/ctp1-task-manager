import { IsString, IsOptional, MinLength, IsDateString, IsArray, IsUUID, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertMilestoneDto {
  @IsUUID()
  @IsOptional()
  id?: string;

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

export class UpdateBuildDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

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
  @Type(() => UpsertMilestoneDto)
  @IsOptional()
  milestones?: UpsertMilestoneDto[];
}
