import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { BookingStatus, BookingType, MembershipStatus, MembershipType, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from '../calendar/calendar.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { GuestBookingDto, GuestPlanType } from './dto/guest-booking.dto';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private calendarService: CalendarService,
    private jwtService: JwtService,
  ) {}

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
  async createBooking(userId: string, dto: CreateBookingDto, userRole?: Role) {
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
    // ADMIN and ADMINISTRATOR roles bypass the membership requirement —
    // they can book any type using their own account for management purposes.
    const isStaff = userRole === Role.ADMIN || userRole === Role.ADMINISTRATOR;

    if (dto.type !== BookingType.GYM && !isStaff) {
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
      const booking = await this.prisma.booking.create({
        data: {
          userId,
          type: BookingType.GYM,
          status: BookingStatus.CONFIRMED,
          bookingDate,
          notes: dto.notes,
        },
        select: bookingSelect,
      });

      // Attempt Google Calendar sync NOW (awaited).
      // If it fails, we log the warning but still return the booking —
      // the booking is permanent regardless of whether calendar sync works.
      try {
        await this.calendarService.createEvent(userId, booking.id);
      } catch (err) {
        this.logger.warn(`Calendar sync failed for booking ${booking.id}: ${(err as Error).message}`);
      }

      // Re-fetch the booking so the response includes the googleEventId
      // that createEvent() wrote to the DB (or null if sync failed/skipped).
      return this.prisma.booking.findUnique({
        where: { id: booking.id },
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
    // Capture the booking outside $transaction so we can sync AFTER it commits.
    // Calling createEvent inside the transaction would be wrong: if Google fails,
    // it would roll back the booking too. Calendar sync is best-effort only.
    const booking = await this.prisma.$transaction(async (tx) => {
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

    // Transaction is committed — booking is permanent in the DB.
    // Attempt Google Calendar sync NOW (awaited).
    // If it fails, we log the warning but still return the booking —
    // a calendar failure must never roll back or hide a confirmed booking.
    try {
      await this.calendarService.createEvent(userId, booking.id);
    } catch (err) {
      this.logger.warn(`Calendar sync failed for booking ${booking.id}: ${(err as Error).message}`);
    }

    // Re-fetch the booking so the response includes the googleEventId
    // that createEvent() wrote to the DB (or null if sync failed/skipped).
    return this.prisma.booking.findUnique({
      where: { id: booking.id },
      select: bookingSelect,
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
        googleEventId: true, // needed to clean up the calendar event on cancel
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

    const cancelled = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
      select: bookingSelect,
    });

    // Remove the calendar event if one was created for this booking.
    if (booking.googleEventId) {
      this.calendarService.deleteEvent(userId, booking.googleEventId).catch((err) =>
        this.logger.warn(`Calendar event deletion failed for booking ${bookingId}: ${err.message}`),
      );
    }

    return cancelled;
  }

  // ─────────────────────────────────────────────────────────────────
  // GUEST BOOKING — public, no JWT required
  //
  // Three supported paths:
  //
  //  A. Anonymous  — no email provided (NONE plan only)
  //     Creates a one-time guest record so the booking FK is satisfied.
  //     Returns QR code but NO JWT — the guest cannot log in later.
  //
  //  B. Register   — email + password, no existing account
  //     Creates the account, assigns membership, books, returns JWT.
  //
  //  C. Login      — email + password, existing account
  //     Verifies password, assigns membership if needed, books, returns JWT.
  // ─────────────────────────────────────────────────────────────────
  async guestBook(dto: GuestBookingDto) {
    let user!: { id: string; name: string; email: string; password: string; role: Role };
    let isNewUser = false;
    let isAnonymous = false;

    // ── PATH A: Anonymous (no email) ──────────────────────────────
    if (!dto.email) {
      // Paid plans require an account — enforce this at the service layer
      // so the backend stays consistent even if the frontend sends a bad request.
      if (dto.planType !== GuestPlanType.NONE) {
        throw new BadRequestException(
          'An email and password are required to sign up for a membership plan.',
        );
      }

      // Name is required even for anonymous so we can display it on the QR screen.
      if (!dto.name || dto.name.trim().length < 2) {
        throw new BadRequestException('Name is required for gym bookings.');
      }

      // Create a throwaway guest record whose email is never exposed.
      // We use a random suffix so it never collides.
      const guestEmail = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}@gymora.guest`;
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 12);

      user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email: guestEmail,
          password: randomPassword,
          role: Role.NON_MEMBER,
        },
      });
      isNewUser = true;
      isAnonymous = true;

    } else {
      // ── PATH B / C: Email provided ────────────────────────────
      if (!dto.password) {
        throw new BadRequestException('Password is required when an email is provided.');
      }

      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });

      if (!existing) {
        // PATH B — new account
        if (!dto.name || dto.name.trim().length < 2) {
          throw new BadRequestException('Full name is required when creating a new account.');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 12);
        user = await this.prisma.user.create({
          data: {
            name: dto.name.trim(),
            email: dto.email,
            password: hashedPassword,
            role: Role.NON_MEMBER,
          },
        });
        isNewUser = true;
      } else {
        // PATH C — existing account (login)
        const isMatch = await bcrypt.compare(dto.password, existing.password);
        if (!isMatch) {
          throw new BadRequestException(
            'An account with this email already exists. Please use your existing password or use "Forgot Password".',
          );
        }
        user = existing;
      }
    }

    // ── Assign membership plan (TRIAL / BASIC / PREMIUM only) ────
    if (dto.planType !== GuestPlanType.NONE) {
      await this.prisma.membership.updateMany({
        where: { userId: user.id, status: MembershipStatus.ACTIVE },
        data: { status: MembershipStatus.CANCELLED },
      });

      const durationDays: Record<string, number> = {
        TRIAL: 14, BASIC: 30, PREMIUM: 30,
      };

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (durationDays[dto.planType] ?? 30));

      await this.prisma.membership.create({
        data: {
          userId: user.id,
          type: dto.planType as MembershipType,
          status: MembershipStatus.ACTIVE,
          startDate,
          endDate,
        },
      });

      await this.prisma.user.update({
        where: { id: user.id },
        data: { role: Role.MEMBER },
      });
      user = (await this.prisma.user.findUnique({ where: { id: user.id } })) ?? user;
    }

    // ── Parse visit date + hour ───────────────────────────────────
    const [year, month, day] = dto.visitDate.split('-').map(Number);
    const bookingDate = new Date(year, month - 1, day, dto.visitHour, 0, 0);

    if (bookingDate <= new Date()) {
      throw new BadRequestException('Visit date must be in the future');
    }

    // ── Create the GYM booking ────────────────────────────────────
    const booking = await this.prisma.booking.create({
      data: {
        userId: user.id,
        type: BookingType.GYM,
        status: BookingStatus.CONFIRMED,
        bookingDate,
      },
      select: bookingSelect,
    });

    // ── Build response ────────────────────────────────────────────
    // Anonymous users get no JWT — they cannot log in later.
    const access_token = isAnonymous
      ? null
      : this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });

    return {
      isNewUser,
      isAnonymous,
      access_token,
      // Expose null email so the frontend knows not to show "log in with X"
      user: {
        id: user.id,
        name: user.name,
        email: isAnonymous ? null : user.email,
        role: user.role,
      },
      booking,
      qrData: `GYMORA-BOOKING-${booking.id}`,
    };
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
  googleEventId: true, // null until user connects Google Calendar
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
