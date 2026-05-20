import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduleStatus, BookingStatus } from '@prisma/client';

// Interface for the optional query filters
interface ScheduleFilters {
  date?: string;       // e.g. "2026-05-20"
  trainerId?: string;  // UUID
  programId?: string;  // UUID
}

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  // ─── CREATE ──────────────────────────────────────────────────────────
  async create(dto: CreateScheduleDto) {
    // Step 1: Make sure the trainer exists
    const trainer = await this.prisma.trainer.findUnique({
      where: { id: dto.trainerId },
    });
    if (!trainer || !trainer.isActive) {
      throw new NotFoundException('Trainer not found or inactive');
    }

    // Step 2: Make sure the program exists
    const program = await this.prisma.program.findUnique({
      where: { id: dto.programId },
    });
    if (!program || !program.isActive) {
      throw new NotFoundException('Program not found or inactive');
    }

    // Step 3: Convert the date strings to Date objects
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    // Step 4: Make sure end time is after start time
    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Step 5: Make sure start time is in the future
    if (startTime <= new Date()) {
      throw new BadRequestException('Schedule must be set in the future');
    }

    // Step 6: Check for trainer time conflict
    // (same trainer can't teach two classes at the same time)
    const conflict = await this.prisma.schedule.findFirst({
      where: {
        trainerId: dto.trainerId,
        status: ScheduleStatus.ACTIVE,
        OR: [
          // New class starts during existing class
          { startTime: { lte: startTime }, endTime: { gt: startTime } },
          // New class ends during existing class
          { startTime: { lt: endTime }, endTime: { gte: endTime } },
          // New class completely wraps existing class
          { startTime: { gte: startTime }, endTime: { lte: endTime } },
        ],
      },
    });

    if (conflict) {
      throw new BadRequestException(
        'This trainer already has a scheduled class during this time',
      );
    }

    // Step 7: Create the schedule
    return this.prisma.schedule.create({
      data: {
        trainerId: dto.trainerId,
        programId: dto.programId,
        startTime,
        endTime,
        room: dto.room,
        notes: dto.notes,
      },
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
    });
  }

  // ─── FIND ALL ─────────────────────────────────────────────────────────
  async findAll(filters: ScheduleFilters) {
    // Build the WHERE clause dynamically based on which filters were provided
    const where: any = {
      status: ScheduleStatus.ACTIVE,
    };

    // Filter by date: only show classes on a specific day
    if (filters.date) {
      const date = new Date(filters.date);
      date.setHours(0, 0, 0, 0);  // start of day
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);  // start of next day

      where.startTime = { gte: date, lt: nextDay };
    }

    if (filters.trainerId) {
      where.trainerId = filters.trainerId;
    }

    if (filters.programId) {
      where.programId = filters.programId;
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
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
        // Count only NON-CANCELLED bookings to get real occupancy
        _count: {
          select: {
            bookings: {
              where: { status: { not: BookingStatus.CANCELLED } },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Add computed fields to each schedule
    return schedules.map((schedule) => ({
      ...schedule,
      currentBookings: schedule._count.bookings,
      availableSpots:
        schedule.program.maxCapacity - schedule._count.bookings,
      isFull:
        schedule._count.bookings >= schedule.program.maxCapacity,
    }));
  }

  // ─── FIND ONE ─────────────────────────────────────────────────────────
  async findOne(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        trainer: true,
        program: true,
        bookings: {
          where: { status: { not: BookingStatus.CANCELLED } },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: {
            bookings: {
              where: { status: { not: BookingStatus.CANCELLED } },
            },
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID "${id}" not found`);
    }

    return {
      ...schedule,
      currentBookings: schedule._count.bookings,
      availableSpots: schedule.program.maxCapacity - schedule._count.bookings,
      isFull: schedule._count.bookings >= schedule.program.maxCapacity,
    };
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateScheduleDto) {
    await this.findOne(id);

    // Build the update data — convert date strings to Date objects if provided
    const data: any = { ...dto };
    if (dto.startTime) data.startTime = new Date(dto.startTime);
    if (dto.endTime) data.endTime = new Date(dto.endTime);

    return this.prisma.schedule.update({
      where: { id },
      data,
      include: {
        trainer: { select: { id: true, name: true } },
        program: { select: { id: true, name: true } },
      },
    });
  }

  // ─── DELETE (soft) ────────────────────────────────────────────────────
  // Mark as CANCELLED instead of deleting
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.schedule.update({
      where: { id },
      data: { status: ScheduleStatus.CANCELLED },
    });
  }
}