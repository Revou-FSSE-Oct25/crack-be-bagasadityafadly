import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateTrainerDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100)
  name: string;

  @IsEmail({}, { message: 'Please enter a valid email' })
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @MinLength(2, { message: 'Speciality must be at least 2 characters' })
  @MaxLength(100)
  speciality: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  bio?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}