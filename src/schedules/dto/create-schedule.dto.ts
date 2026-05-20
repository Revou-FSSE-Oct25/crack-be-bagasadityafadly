import {
  IsUUID,
  IsDateString,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateScheduleDto {
  // IsUUID validates the value is a proper UUID format
  @IsUUID('4', { message: 'trainerId must be a valid UUID' })
  trainerId: string;

  @IsUUID('4', { message: 'programId must be a valid UUID' })
  programId: string;

  // IsDateString validates the value is a valid ISO date string
  // Example: "2026-05-20T06:00:00.000Z"
  @IsDateString({}, { message: 'startTime must be a valid date string (ISO format)' })
  startTime: string;

  @IsDateString({}, { message: 'endTime must be a valid date string (ISO format)' })
  endTime: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  room?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}