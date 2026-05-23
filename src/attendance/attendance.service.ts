import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { BookingStatus, BookingType, XPSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { ChallengesService } from '../challenges/challenges.service';

// How many XP each booking type earns on check-in
const BASE_XP: Record<BookingType, number> = {
  GYM: 10,
  CLASS: 20,
  PT: 30,
};

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private prisma: PrismaService,
    private badgesService: BadgesService,
    private challengesService: ChallengesService,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // CHECK IN — the central gamification trigger
  //
  // Everything happens here in order:
  //   1. Validate the booking belongs to this user and is CONFIRMED
  //   2. Prevent double check-in
  //   3. Calculate XP (base + happy hour multiplier)
  //   4. Calculate new streak (consecutive days)
  //   5. Detect streak milestones (3 / 7 / 30 days)
  //   6. Persist everything atomically in a transaction
  //   7. (After transaction) check badge conditions
  //   8. (After transaction) update challenge progress
  // ─────────────────────────────────────────────────────────────────
  async checkIn(userId: string, bookingId: string) {
    // ── CORE: atomic transaction ───────────────────────────────────
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Load and validate the booking
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      if (booking.userId !== userId) {
        throw new ForbiddenException('This booking does not belong to you');
      }
      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new BadRequestException(
          `Cannot check in — booking status is "${booking.status}". Must be CONFIRMED.`,
        );
      }

      // 2. Prevent double check-in (idempotency guard)
      const alreadyCheckedIn = await tx.attendanceLog.findFirst({
        where: { bookingId, userId },
      });
      if (alreadyCheckedIn) {
        throw new ConflictException('You have already checked in to this booking');
      }

      // 3. Calculate XP
      //    Base XP depends on booking type (GYM=10, CLASS=20, PT=30)
      //    Happy Hour multiplier (1.5×) applies before 07:00 or after 21:00
      const baseXp = BASE_XP[booking.type];
      const hour = new Date().getHours(); // server local hour
      const isHappyHour = hour < 7 || hour >= 21;
      const xpEarned = Math.round(baseXp * (isHappyHour ? 1.5 : 1.0));

      // 4. Create the attendance log
      const attendanceLog = await tx.attendanceLog.create({
        data: { userId, bookingId, xpEarned },
      });

      // 5. Mark booking as COMPLETED (user physically showed up)
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.COMPLETED },
      });

      // 6. Load the user's current gamification state
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          xpTotal: true,
          level: true,
          streakCount: true,
          lastCheckIn: true,
        },
      });

      // The user must exist because their booking passed validation above
      if (!user) throw new NotFoundException('User not found');

      // 7. Calculate new streak
      //    Compare DATES (not timestamps!) to handle midnight edge cases
      const today = toDateString(new Date());
      const yesterday = toDateString(new Date(Date.now() - 86_400_000));
      const lastDate = user.lastCheckIn ? toDateString(user.lastCheckIn) : null;

      let newStreak: number;
      if (lastDate === today) {
        // Already checked in today — streak doesn't change
        newStreak = user.streakCount;
      } else if (lastDate === yesterday) {
        // Consecutive day — increment streak
        newStreak = user.streakCount + 1;
      } else {
        // Missed one or more days — reset to 1
        newStreak = 1;
      }

      // 8. Calculate new XP total and level
      //    Level formula: every 100 XP = 1 level (level 1 starts at 0)
      const newXpTotal = user.xpTotal + xpEarned;
      const newLevel = Math.floor(newXpTotal / 100) + 1;

      // 9. Check streak milestones and build user update payload
      let milestoneReached: string | null = null;
      let couponCode: string | null = null;

      const userUpdates: Record<string, unknown> = {
        xpTotal: newXpTotal,
        level: newLevel,
        streakCount: newStreak,
        lastCheckIn: new Date(),
      };

      // Milestone: 3 days → unlock Bronze Profile Border
      if (newStreak === 3) {
        userUpdates.bronzeBorderUnlocked = true;
        milestoneReached = '3_DAYS';
      }

      // Milestone: 7 days → generate Free Protein Drink coupon
      if (newStreak === 7) {
        milestoneReached = '7_DAYS';
        couponCode = `GF-PROTEIN-${userId.slice(-6).toUpperCase()}-${Date.now()}`;

        // Find the protein drink reward and grant it to this user
        const reward = await tx.reward.findFirst({
          where: { name: 'Free Protein Drink', isActive: true },
        });
        if (reward) {
          await tx.userReward.create({
            data: { userId, rewardId: reward.id, couponCode },
          });
        } else {
          // Reward not seeded yet — just store the code, no UserReward row
          this.logger.warn(
            `"Free Protein Drink" reward not found in DB. Seed it to enable coupon grants.`,
          );
        }
      }

      // Milestone: 30 days → unlock PT application pathway
      if (newStreak === 30) {
        userUpdates.canApplyAsPT = true;
        milestoneReached = '30_DAYS';
      }

      // 10. Persist all user changes atomically
      await tx.user.update({
        where: { id: userId },
        data: userUpdates,
      });

      // 11. Write XP audit log entry
      await tx.xpHistory.create({
        data: {
          userId,
          source: XPSource.ATTENDANCE,
          amount: xpEarned,
          description: `${booking.type} check-in${isHappyHour ? ' (Happy Hour 1.5×)' : ''}`,
        },
      });

      // Also write a streak log entry when a milestone is reached
      if (milestoneReached) {
        await tx.xpHistory.create({
          data: {
            userId,
            source: XPSource.STREAK,
            amount: 0,
            description: `${newStreak}-day streak milestone reached: ${milestoneReached}`,
          },
        });
      }

      return {
        attendanceId: attendanceLog.id,
        bookingId,
        bookingType: booking.type,
        xpEarned,
        happyHour: isHappyHour,
        newXpTotal,
        newLevel,
        streakCount: newStreak,
        milestoneReached,
        couponCode,
      };
    });

    // ── AFTER TRANSACTION: badge check + challenge update ──────────
    // These run OUTSIDE the transaction — a failure here must NOT
    // roll back the check-in that already committed to the DB.

    const badgesAwarded = await this.badgesService
      .checkAndAward(userId)
      .catch((err: Error) => {
        this.logger.warn(`Badge check failed for user ${userId}: ${err.message}`);
        return []; // return empty array, don't crash
      });

    await this.challengesService
      .updateProgressOnCheckIn(userId)
      .catch((err: Error) => {
        this.logger.warn(`Challenge update failed for user ${userId}: ${err.message}`);
      });

    return { ...result, badgesAwarded };
  }

  // ─────────────────────────────────────────────────────────────────
  // GET MY ATTENDANCE — the logged-in user's check-in history
  // ─────────────────────────────────────────────────────────────────
  async getMyAttendance(userId: string) {
    return this.prisma.attendanceLog.findMany({
      where: { userId },
      orderBy: { checkedAt: 'desc' },
      include: {
        booking: {
          select: {
            type: true,
            bookingDate: true,
            schedule: {
              select: {
                class: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// HELPER: converts a Date to "YYYY-MM-DD" for calendar-day comparison.
// Using strings instead of timestamps prevents timezone/midnight bugs.
// ─────────────────────────────────────────────────────────────────
function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}
