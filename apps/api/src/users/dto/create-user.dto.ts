import { IsString, MinLength, IsOptional, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @IsIn(['MEMBER', 'PM', 'ADMIN'])
  @IsOptional()
  role?: string;
}
