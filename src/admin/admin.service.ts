import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, MembershipStatus, MembershipType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Stats ────────────────────────────────────────────────────────────────

  async getStats() {
    const [
      totalUsers,
      totalBookings,
      totalCheckIns,
      activeMembers,
      totalNonMembers,
      totalRevenueSim,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.booking.count(),
      this.prisma.attendanceLog.count(),
      this.prisma.membership.count({ where: { status: MembershipStatus.ACTIVE } }),
      this.prisma.user.count({ where: { role: Role.NON_MEMBER } }),
      // Simulated revenue: count GYM bookings × 50k + BASIC memberships × 250k + PREMIUM × 500k
      this.prisma.booking.count({ where: { type: 'GYM', status: 'CONFIRMED' } }),
    ]);

    return {
      totalUsers,
      totalBookings,
      totalCheckIns,
      activeMembers,
      totalNonMembers,
      // Simulated monthly revenue figure (demo only)
      estimatedRevenue: totalRevenueSim * 50_000,
    };
  }

  // ── Users ────────────────────────────────────────────────────────────────

  findAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        xpTotal: true,
        level: true,
        streakCount: true,
        isActive: true,
        createdAt: true,
        memberships: {
          where: { status: MembershipStatus.ACTIVE },
          select: { id: true, type: true, status: true, startDate: true, endDate: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserRole(userId: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async assignMembership(userId: string, type: MembershipType, durationDays: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.membership.updateMany({
      where: { userId, status: MembershipStatus.ACTIVE },
      data: { status: MembershipStatus.CANCELLED },
    });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    const membership = await this.prisma.membership.create({
      data: { userId, type, status: MembershipStatus.ACTIVE, startDate, endDate },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { role: Role.MEMBER },
    });

    return membership;
  }

  async deactivateUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: { id: true, name: true, isActive: true },
    });
  }

  // ── Bookings ─────────────────────────────────────────────────────────────

  findAllBookings(limit = 50) {
    return this.prisma.booking.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        bookingDate: true,
        createdAt: true,
        notes: true,
        user: { select: { id: true, name: true, email: true, role: true } },
        schedule: {
          select: {
            class: { select: { name: true } },
            trainer: { select: { name: true } },
          },
        },
      },
    });
  }

  async updateBookingStatus(bookingId: string, status: BookingStatus) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      select: { id: true, status: true, type: true, bookingDate: true },
    });
  }

  // ── Classes ──────────────────────────────────────────────────────────────

  createClass(data: {
    name: string;
    description?: string;
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    durationMinutes: number;
    capacity: number;
    caloriesEstimate?: number;
  }) {
    return this.prisma.class.create({ data });
  }

  async deleteClass(classId: string) {
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');
    return this.prisma.class.update({
      where: { id: classId },
      data: { isActive: false },
    });
  }

  // ── Schedules ────────────────────────────────────────────────────────────

  createSchedule(data: {
    classId: string;
    trainerId: string;
    startTime: string;
    endTime: string;
    roomOrZone?: string;
  }) {
    return this.prisma.schedule.create({
      data: {
        classId: data.classId,
        trainerId: data.trainerId,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        roomOrZone: data.roomOrZone,
      },
      include: {
        class: { select: { name: true } },
        trainer: { select: { name: true } },
      },
    });
  }

  async deleteSchedule(scheduleId: string) {
    const schedule = await this.prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return this.prisma.schedule.update({
      where: { id: scheduleId },
      data: { isActive: false },
    });
  }

  findAllSchedules() {
    return this.prisma.schedule.findMany({
      where: { isActive: true, startTime: { gt: new Date() } },
      include: {
        class: { select: { id: true, name: true, capacity: true } },
        trainer: { select: { id: true, name: true } },
        _count: {
          select: { bookings: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } } },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 100,
    });
  }

  // ── Trainers ─────────────────────────────────────────────────────────────

  findAllTrainers() {
    return this.prisma.trainer.findMany({
      select: {
        id: true,
        name: true,
        specialty: true,
        bio: true,
        avatarUrl: true,
        isActive: true,
        _count: { select: { schedules: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  createTrainer(data: { name: string; email: string; specialty?: string; bio?: string; avatarUrl?: string }) {
    return this.prisma.trainer.create({
      data,
      select: { id: true, name: true, specialty: true, bio: true, isActive: true },
    });
  }

  async updateTrainer(
    trainerId: string,
    data: { name?: string; specialty?: string; bio?: string; isActive?: boolean },
  ) {
    const trainer = await this.prisma.trainer.findUnique({ where: { id: trainerId } });
    if (!trainer) throw new NotFoundException('Trainer not found');
    return this.prisma.trainer.update({
      where: { id: trainerId },
      data,
      select: { id: true, name: true, specialty: true, bio: true, isActive: true },
    });
  }

  // ── Memberships ───────────────────────────────────────────────────────────

  findAllMemberships() {
    return this.prisma.membership.findMany({
      where: { status: MembershipStatus.ACTIVE },
      select: {
        id: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelMembership(membershipId: string) {
    const membership = await this.prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership) throw new NotFoundException('Membership not found');

    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: { status: MembershipStatus.CANCELLED },
    });

    // Check if user still has any active membership; if not, downgrade role
    const remaining = await this.prisma.membership.count({
      where: { userId: membership.userId, status: MembershipStatus.ACTIVE },
    });
    if (remaining === 0) {
      await this.prisma.user.update({
        where: { id: membership.userId },
        data: { role: Role.NON_MEMBER },
      });
    }

    return updated;
  }
}
