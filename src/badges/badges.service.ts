import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// What we know about the user when checking badge conditions
interface BadgeContext {
  xpTotal: number;
  streakCount: number;
  attendanceCount: number;
}

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────
  // CHECK AND AWARD — called after every check-in.
  // Returns the list of badges newly awarded this time.
  // ─────────────────────────────────────────────────────────────────
  async checkAndAward(userId: string): Promise<Array<{ name: string; description: string | null }>> {
    // Load the user's current state
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xpTotal: true, streakCount: true },
    });

    if (!user) return []; // user deleted mid-request — nothing to award

    // Count how many times they have checked in total
    const attendanceCount = await this.prisma.attendanceLog.count({
      where: { userId },
    });

    // Get all badge IDs the user already has (to skip them)
    const alreadyEarned = await this.prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    const earnedIds = new Set(alreadyEarned.map((b) => b.badgeId));

    // Load all available badges
    const allBadges = await this.prisma.badge.findMany();

    const context: BadgeContext = {
      xpTotal: user.xpTotal,
      streakCount: user.streakCount,
      attendanceCount,
    };

    const newlyAwarded: Array<{ name: string; description: string | null }> = [];

    for (const badge of allBadges) {
      // Skip badges already earned
      if (earnedIds.has(badge.id)) continue;

      // Check if condition is now met
      const shouldAward = this.evaluateCondition(badge.name, context);
      if (shouldAward) {
        await this.prisma.userBadge.create({
          data: { userId, badgeId: badge.id },
        });
        newlyAwarded.push({ name: badge.name, description: badge.description });
        this.logger.log(`Badge "${badge.name}" awarded to user ${userId}`);
      }
    }

    return newlyAwarded;
  }

  // ─────────────────────────────────────────────────────────────────
  // GET MY BADGES — badges the logged-in user has earned
  // ─────────────────────────────────────────────────────────────────
  async getMyBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: {
          select: { name: true, description: true, iconUrl: true, xpReward: true },
        },
      },
      orderBy: { earnedAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // GET ALL BADGES — public list of every badge that can be earned
  // ─────────────────────────────────────────────────────────────────
  async getAllBadges() {
    return this.prisma.badge.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // EVALUATE CONDITION — maps badge name to the rule that unlocks it.
  // Add new badges here by adding a new case.
  // ─────────────────────────────────────────────────────────────────
  private evaluateCondition(badgeName: string, ctx: BadgeContext): boolean {
    switch (badgeName) {
      case 'First Step':
        // Awarded after the very first check-in
        return ctx.attendanceCount >= 1;

      case 'Bronze Streak':
        // Awarded when the user reaches a 3-day streak
        return ctx.streakCount >= 3;

      case 'Week Warrior':
        // Awarded when the user reaches a 7-day streak
        return ctx.streakCount >= 7;

      case 'Iron Regular':
        // Awarded after 10 total check-ins
        return ctx.attendanceCount >= 10;

      case 'Century Club':
        // Awarded when xpTotal reaches 100
        return ctx.xpTotal >= 100;

      default:
        // Unknown badge — never auto-award
        return false;
    }
  }
}
