import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';

// ALL routes in this controller require a valid JWT token
@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // POST /api/bookings — Any logged-in user can book
  @Post()
  create(
    @GetUser('id') userId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(userId, dto);
  }

  // GET /api/bookings — Returns the logged-in user's own bookings
  // IMPORTANT: This route must come BEFORE GET /api/bookings/:id
  @Get()
  findUserBookings(@GetUser('id') userId: string) {
    return this.bookingsService.findUserBookings(userId);
  }

  // GET /api/bookings/all — Admin only: get ALL users' bookings
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.bookingsService.findAll();
  }

  // GET /api/bookings/:id — Get one specific booking
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ) {
    return this.bookingsService.findOne(id, userId, userRole);
  }

  // PATCH /api/bookings/:id — Admin updates booking status
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.bookingsService.updateStatus(id, dto.status!);
  }

  // DELETE /api/bookings/:id — Cancel a booking (owner or admin)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ) {
    return this.bookingsService.cancel(id, userId, userRole);
  }
}