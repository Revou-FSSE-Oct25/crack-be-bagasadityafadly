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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Every route in this controller requires a valid JWT.
// @UseGuards at the class level applies to ALL methods below.
@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // POST /bookings
  // Create a new booking (GYM / CLASS / PT)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.createBooking(user.id, dto);
  }

  // GET /bookings/my
  // List all bookings belonging to the logged-in user.
  // NOTE: this route must come BEFORE /:id — otherwise NestJS would
  // try to treat "my" as a booking ID parameter.
  @Get('my')
  getMyBookings(@CurrentUser() user: { id: string }) {
    return this.bookingsService.getMyBookings(user.id);
  }

  // GET /bookings/:id
  // Get a single booking by ID (must belong to the current user).
  @Get(':id')
  getOne(
    @CurrentUser() user: { id: string },
    @Param('id') bookingId: string,
  ) {
    return this.bookingsService.getBookingById(user.id, bookingId);
  }

  // PATCH /bookings/:id/cancel
  // Cancel an existing booking.
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser() user: { id: string },
    @Param('id') bookingId: string,
  ) {
    return this.bookingsService.cancelBooking(user.id, bookingId);
  }
}
