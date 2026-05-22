import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [CalendarModule], // gives BookingsService access to CalendarService
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
