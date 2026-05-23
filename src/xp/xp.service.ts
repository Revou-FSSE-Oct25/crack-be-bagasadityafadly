import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class XpService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────
  // GET MY XP — summary + recent history for the logged-in user
  // ─────────────────────────────────────────────────────────────────
  async getMyXp(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        xpTotal: true,
        level: true,
        streakCount: true,
        bronzeBorderUnlocked: true,
        canApplyAsPT: true,
      },
    });

    const history = await this.prisma.xpHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { source: true, amount: true, description: true, createdAt: true },
    });

    return { ...user, history };
  }

  // ─────────────────────────────────────────────────────────────────
  // LEADERBOARD — top N users ranked by xpTotal
  // ─────────────────────────────────────────────────────────────────
  async getLeaderboard(limit = 10) {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      orderBy: { xpTotal: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        xpTotal: true,
        level: true,
        avatarUrl: true,
        streakCount: true,
      },
    });

    // Add rank number to each entry (1, 2, 3...)
    return users.map((u, i) => ({ rank: i + 1, ...u }));
  }
}
