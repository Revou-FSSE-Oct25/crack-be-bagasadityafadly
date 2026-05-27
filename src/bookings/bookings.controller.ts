import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { GuestBookingDto } from './dto/guest-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ── PUBLIC: Guest booking (no login required) ─────────────────────
  // Must be declared BEFORE the class-level @UseGuards so it stays public.
  @Post('guest')
  @HttpCode(HttpStatus.CREATED)
  guestBook(@Body() dto: GuestBookingDto) {
    return this.bookingsService.guestBook(dto);
  }

  // POST /bookings  (requires login)
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.createBooking(user.id, dto);
  }

  // GET /bookings/my  (requires login)
  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyBookings(@CurrentUser() user: { id: string }) {
    return this.bookingsService.getMyBookings(user.id);
  }

  // GET /bookings/:id  (requires login)
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getOne(
    @CurrentUser() user: { id: string },
    @Param('id') bookingId: string,
  ) {
    return this.bookingsService.getBookingById(user.id, bookingId);
  }

  // PATCH /bookings/:id/cancel  (requires login)
  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser() user: { id: string },
    @Param('id') bookingId: string,
  ) {
    return this.bookingsService.cancelBooking(user.id, bookingId);
  }
}
