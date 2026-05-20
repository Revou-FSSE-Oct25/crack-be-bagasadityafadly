import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus, ScheduleStatus } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  // ─── CREATE BOOKING (with race condition protection) ────────────────
  async create(userId: string, dto: CreateBookingDto) {
    // $transaction wraps everything in one atomic database operation.
    // Either ALL steps succeed, or NONE of them do.
    // This is what prevents double-booking.
    return this.prisma.$transaction(async (tx) => {
      // ── STEP 1: Get the schedule (with its program for capacity info) ──
      const schedule = await tx.schedule.findUnique({
        where: { id: dto.scheduleId },
        include: {
          program: true,
          trainer: { select: { id: true, name: true, speciality: true } },
        },
      });

      if (!schedule) {
        throw new NotFoundException('Schedule not found');
      }

      // ── STEP 2: Make sure the class is still bookable ──────────────────
      if (schedule.status !== ScheduleStatus.ACTIVE) {
        throw new BadRequestException(
          'This class is not available for booking',
        );
      }

      // Cannot book a class that already started
      if (new Date(schedule.startTime) <= new Date()) {
        throw new BadRequestException(
          'Cannot book a class that has already started or passed',
        );
      }

      // ── STEP 3: Check if user already has a booking for this schedule ──
      const existingBooking = await tx.booking.findUnique({
        where: {
          // This uses the @@unique([userId, scheduleId]) constraint from Phase 3 schema
          userId_scheduleId: {
            userId,
            scheduleId: dto.scheduleId,
          },
        },
      });

      if (existingBooking) {
        // Special case: allow re-booking if they previously cancelled
        if (existingBooking.status === BookingStatus.CANCELLED) {
          // Still need to check capacity before allowing re-book
          const currentCount = await tx.booking.count({
            where: {
              scheduleId: dto.scheduleId,
              status: { not: BookingStatus.CANCELLED },
            },
          });

          if (currentCount >= schedule.program.maxCapacity) {
            throw new BadRequestException(
              'Sorry, this schedule is already full.',
            );
          }

          // Update the cancelled booking back to confirmed
          return tx.booking.update({
            where: { id: existingBooking.id },
            data: {
              status: BookingStatus.CONFIRMED,
              cancelledAt: null,
              notes: dto.notes,
            },
            include: {
              schedule: {
                include: {
                  trainer: { select: { id: true, name: true, speciality: true } },
                  program: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                      duration: true,
                      maxCapacity: true,
                    },
                  },
                },
              },
            },
          });
        }

        // Active booking already exists
        throw new ConflictException(
          'You have already booked this class',
        );
      }

      // ── STEP 4: COUNT ACTIVE BOOKINGS (THE CRITICAL SAFETY CHECK) ─────
      // This count happens INSIDE the transaction.
      // If two users are in transactions simultaneously,
      // PostgreSQL ensures they get accurate counts.
      const currentBookingsCount = await tx.booking.count({
        where: {
          scheduleId: dto.scheduleId,
          // Only count non-cancelled bookings
          status: { not: BookingStatus.CANCELLED },
        },
      });

      // ── STEP 5: REJECT IF CLASS IS FULL ───────────────────────────────
      if (currentBookingsCount >= schedule.program.maxCapacity) {
        throw new BadRequestException(
          'Sorry, this schedule is already full.',
        );
      }

      // ── STEP 6: CREATE THE BOOKING ─────────────────────────────────────
      // Only reaches here if all checks passed
      return tx.booking.create({
        data: {
          userId,
          scheduleId: dto.scheduleId,
          status: BookingStatus.CONFIRMED,
          notes: dto.notes,
        },
        include: {
          schedule: {
            include: {
              trainer: {
                select: { id: true, name: true, speciality: true },
              },
              program: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  duration: true,
                  maxCapacity: true,
                  price: true,
                },
              },
            },
          },
        },
      });
    });
  }

  // ─── GET USER'S OWN BOOKINGS ────────────────────────────────────────
  async findUserBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        schedule: {
          include: {
            trainer: {
              select: {
                id: true,
                name: true,
                speciality: true,
                avatarUrl: true,
              },
            },
            program: {
              select: {
                id: true,
                name: true,
                category: true,
                duration: true,
                maxCapacity: true,
                price: true,
              },
            },
          },
        },
      },
      // Most recent schedules first
      orderBy: { schedule: { startTime: 'desc' } },
    });
  }

  // ─── GET ONE BOOKING ────────────────────────────────────────────────
  async findOne(id: string, userId: string, userRole: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        schedule: {
          include: {
            trainer: true,
            program: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Regular users can only see their own bookings
    if (booking.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only view your own bookings');
    }

    return booking;
  }

  // ─── CANCEL BOOKING ─────────────────────────────────────────────────
  async cancel(bookingId: string, userId: string, userRole: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { schedule: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Only the booking owner or an admin can cancel
    if (booking.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('This booking is already cancelled');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed booking');
    }

    // Cannot cancel after class has already started
    if (new Date(booking.schedule.startTime) < new Date()) {
      throw new BadRequestException(
        'Cannot cancel a booking after the class has started',
      );
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }

  // ─── ADMIN: GET ALL BOOKINGS ─────────────────────────────────────────
  async findAll() {
    return this.prisma.booking.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        schedule: {
          include: {
            trainer: { select: { id: true, name: true } },
            program: { select: { id: true, name: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── ADMIN: UPDATE BOOKING STATUS ───────────────────────────────────
  async updateStatus(bookingId: string, status: BookingStatus) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });
  }
}