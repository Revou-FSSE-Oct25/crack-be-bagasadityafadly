import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { BookingType } from '@prisma/client';

export class CreateBookingDto {
  // Which type of booking: GYM / CLASS / PT
  @IsNotEmpty({ message: 'Booking type is required' })
  @IsEnum(BookingType, { message: 'type must be GYM, CLASS, or PT' })
  type!: BookingType;

  // The date/time the user wants to attend.
  // ISO 8601 format: "2026-06-01T09:00:00.000Z"
  // - GYM: the date they want to visit the gym
  // - CLASS/PT: should match the schedule's startTime
  @IsNotEmpty({ message: 'Booking date is required' })
  @IsISO8601({}, { message: 'bookingDate must be a valid ISO 8601 date string' })
  bookingDate!: string;

  // Required for CLASS and PT bookings. Identifies which specific
  // scheduled session the user wants to join.
  @IsOptional()
  @IsString()
  scheduleId?: string;

  // Required for PT bookings. Identifies which trainer.
  @IsOptional()
  @IsString()
  trainerId?: string;

  // Optional message to the trainer or admin.
  @IsOptional()
  @IsString()
  notes?: string;
}
