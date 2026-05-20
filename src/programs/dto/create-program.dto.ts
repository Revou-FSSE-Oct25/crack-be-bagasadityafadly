import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ProgramCategory } from '@prisma/client';

export class CreateProgramDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  // IsEnum checks the value is one of: FAT_LOSS, MUSCLE_GAIN, STRENGTH, MOBILITY, CARDIO, GENERAL
  @IsEnum(ProgramCategory, {
    message: 'Category must be: FAT_LOSS, MUSCLE_GAIN, STRENGTH, MOBILITY, CARDIO, or GENERAL',
  })
  category: ProgramCategory;

  @IsInt({ message: 'Duration must be a whole number (minutes)' })
  @Min(15, { message: 'Duration must be at least 15 minutes' })
  @Max(300, { message: 'Duration cannot exceed 300 minutes' })
  duration: number;  // in minutes

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  maxCapacity?: number;

  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price cannot be negative' })
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}