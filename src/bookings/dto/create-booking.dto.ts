import { IsUUID, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateBookingDto {
  // The schedule the user wants to book
  @IsUUID('4', { message: 'scheduleId must be a valid UUID' })
  scheduleId: string;

  // Optional note (e.g. "I have a knee injury")
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string;
}