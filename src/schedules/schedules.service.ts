import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List upcoming active schedules.
   * Optionally filter by classId or trainerId.
   * Only returns schedules whose startTime is in the future.
   */
  async findAll(filters: { classId?: string; trainerId?: string } = {}) {
    const schedules = await this.prisma.schedule.findMany({
      where: {
        isActive: true,
        startTime: { gt: new Date() },
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.trainerId ? { trainerId: filters.trainerId } : {}),
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            capacity: true,
            difficulty: true,
            caloriesEstimate: true,
          },
        },
        trainer: {
          select: { id: true, name: true, specialty: true, avatarUrl: true },
        },
        _count: {
          select: {
            bookings: {
              where: { status: { in: ['PENDING', 'CONFIRMED'] } },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 60,
    });

    return schedules.map((s) => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      roomOrZone: s.roomOrZone,
      isActive: s.isActive,
      class: s.class,
      trainer: s.trainer,
      spotsLeft: Math.max(0, s.class.capacity - s._count.bookings),
      totalBooked: s._count.bookings,
    }));
  }
}
