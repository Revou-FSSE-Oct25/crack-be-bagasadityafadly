import { IsEnum, IsOptional } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class UpdateBookingDto {
  @IsEnum(BookingStatus, {
    message: 'Status must be: PENDING, CONFIRMED, CANCELLED, or COMPLETED',
  })
  @IsOptional()
  status?: BookingStatus;
}