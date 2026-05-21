import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingStatus, BookingType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────
  // CREATE BOOKING — the main booking flow
  //
  // This method handles all three booking types. The flow is:
  //   1. Validate the request fields match the booking type
  //   2. Check the user has an active membership (CLASS/PT only)
  //   3. Use a TRANSACTION to:
  //      a. Load the schedule + class capacity
  //      b. Count current confirmed/pending bookings
  //      c. Reject if full
  //      d. Create the booking
  //
  // Steps 3a–3d are wrapped in $transaction so they are ATOMIC.
  // No other request can sneak in between the capacity check and the insert.
  // ─────────────────────────────────────────────────────────────────
  async createBooking(userId: string, dto: CreateBookingDto) {
    // ── STEP 1: Field-level cross-validation ──────────────────────
    // The DTO validates individual fields, but cross-field rules
    // (e.g. "if type is PT then trainerId is required") must be
    // checked here in the service where we have full context.

    if (dto.type === BookingType.CLASS && !dto.scheduleId) {
      throw new BadRequestException('scheduleId is required for CLASS bookings');
    }

    if (dto.type === BookingType.PT) {
      if (!dto.scheduleId) {
        throw new BadRequestException('scheduleId is required for PT bookings');
      }
      if (!dto.trainerId) {
        throw new BadRequestException('trainerId is required for PT bookings');
      }
    }

    // ── STEP 2: Booking date must be in the future ─────────────────
    // You cannot book a session that has already happened.
    const bookingDate = new Date(dto.bookingDate);
    if (bookingDate <= new Date()) {
      throw new BadRequestException('Booking date must be in the future');
    }

    // ── STEP 3: Membership check (CLASS and PT only) ──────────────
    // GYM bookings are open to everyone. CLASS and PT require
    // an active paid membership.
    if (dto.type !== BookingType.GYM) {
      const activeMembership = await this.prisma.membership.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          endDate: { gt: new Date() }, // membership hasn't expired yet
        },
      });

      if (!activeMembership) {
        throw new ForbiddenException(
          'An active membership is required to book classes or PT sessions',
        );
      }
    }

    // ── STEP 4: GYM booking — simple path ─────────────────────────
    // No capacity limit. No schedule. Just record that the user
    // wants to visit on a specific date.
    if (dto.type === BookingType.GYM) {
      return this.prisma.booking.create({
        data: {
          userId,
          type: BookingType.GYM,
          status: BookingStatus.CONFIRMED, // GYM bookings auto-confirm
          bookingDate,
          notes: dto.notes,
        },
        select: bookingSelect,
      });
    }

    // ── STEP 5: CLASS / PT booking — transaction path ─────────────
    //
    // WHY A TRANSACTION?
    //
    // Without a transaction, this sequence is NOT safe:
    //
    //   const count = await prisma.booking.count(...);  ← read
    //   if (count >= capacity) throw ...;               ← check
    //   await prisma.booking.create(...);               ← write
    //
    // Between the read and the write, another request could also
    // read the same count, pass the check, and create a booking.
    // Both would succeed, overbooking the class.
    //
    // Inside $transaction, Prisma opens a DB transaction. The database
    // serialises concurrent writes — the second transaction has to wait
    // until the first completes, then it reads the updated count.
    //
    // The @@unique([userId, scheduleId]) constraint is a second safety
    // net: even if two transactions race perfectly, the DB will reject
    // the second INSERT with a P2002 unique violation.
    //
    return this.prisma.$transaction(async (tx) => {
      // 5a. Load the schedule with its class (for capacity) and trainer
      const schedule = await tx.schedule.findUnique({
        where: { id: dto.scheduleId },
        include: {
          class: { select: { capacity: true, name: true } },
          trainer: { select: { id: true, name: true, isActive: true } },
        },
      });

      if (!schedule) {
        throw new NotFoundException('Schedule not found');
      }

      if (!schedule.isActive) {
        throw new BadRequestException('This session has been cancelled');
      }

      // 5b. Booking date must not be in the past relative to schedule
      if (schedule.startTime <= new Date()) {
        throw new BadRequestException('This session has already started or ended');
      }

      // 5c. PT-specific: verify the trainer matches the schedule
      if (dto.type === BookingType.PT) {
        if (schedule.trainerId !== dto.trainerId) {
          throw new BadRequestException(
            'The specified trainer is not assigned to this schedule',
          );
        }
        if (!schedule.trainer.isActive) {
          throw new BadRequestException('This trainer is not currently available');
        }
      }

      // 5d. Count how many active bookings already exist for this schedule
      // We count PENDING + CONFIRMED — cancelled/no-show bookings free up slots.
      const confirmedCount = await tx.booking.count({
        where: {
          scheduleId: dto.scheduleId,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        },
      });

      if (confirmedCount >= schedule.class.capacity) {
        throw new ConflictException(
          `This session is fully booked (capacity: ${schedule.class.capacity})`,
        );
      }

      // 5e. Create the booking — if @@unique([userId, scheduleId]) fires,
      // Prisma throws P2002 which our AllExceptionsFilter maps to 409.
      const booking = await tx.booking.create({
        data: {
          userId,
          scheduleId: dto.scheduleId,
          trainerId: dto.trainerId ?? null,
          type: dto.type,
          status: BookingStatus.CONFIRMED,
          bookingDate: schedule.startTime, // use the actual schedule time
          notes: dto.notes,
        },
        select: bookingSelect,
      });

      return booking;
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // GET MY BOOKINGS — list the current user's bookings
  // ─────────────────────────────────────────────────────────────────
  async getMyBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      select: bookingSelect,
      orderBy: { bookingDate: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // GET ONE BOOKING — fetch a single booking, must belong to this user
  // ─────────────────────────────────────────────────────────────────
  async getBookingById(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: bookingSelect,
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Security: users can only see their own bookings.
    // Admins would bypass this check — but that's a future concern.
    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return booking;
  }

  // ─────────────────────────────────────────────────────────────────
  // CANCEL BOOKING — user cancels their own booking
  //
  // Business rules:
  // - Can only cancel PENDING or CONFIRMED bookings
  // - Cannot cancel a booking whose session has already started
  // - Cannot cancel someone else's booking
  // ─────────────────────────────────────────────────────────────────
  async cancelBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        status: true,
        bookingDate: true,
        type: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    const cancellableStatuses: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED];
    if (!cancellableStatuses.includes(booking.status)) {
      throw new BadRequestException(
        `Cannot cancel a booking with status: ${booking.status}`,
      );
    }

    if (booking.bookingDate <= new Date()) {
      throw new BadRequestException(
        'Cannot cancel a booking after the session has started',
      );
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
      select: bookingSelect,
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// SELECT SHAPE — what we return for every booking response.
//
// Defined once here so every method returns a consistent shape.
// The `satisfies` keyword checks this object against Prisma's
// BookingSelect type — TypeScript will error if we reference a
// field that doesn't exist on the model.
// ─────────────────────────────────────────────────────────────────
const bookingSelect = {
  id: true,
  userId: true,
  type: true,
  status: true,
  bookingDate: true,
  notes: true,
  createdAt: true,
  schedule: {
    select: {
      id: true,
      startTime: true,
      endTime: true,
      roomOrZone: true,
      class: { select: { name: true, durationMinutes: true, capacity: true } },
      trainer: { select: { name: true } },
    },
  },
  trainer: {
    select: { id: true, name: true },
  },
} satisfies Prisma.BookingSelect;
