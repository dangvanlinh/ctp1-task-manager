import { IsString, MinLength, IsEmail, IsOptional, IsIn } from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsString()
  @IsIn(['MEMBER', 'PM', 'ADMIN'])
  @IsOptional()
  role?: string;
}
