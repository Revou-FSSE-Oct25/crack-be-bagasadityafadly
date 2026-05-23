import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RewardsService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────
  // GET ALL REWARDS — public list of active rewards and their XP cost
  // ─────────────────────────────────────────────────────────────────
  async getAllRewards() {
    return this.prisma.reward.findMany({
      where: { isActive: true },
      orderBy: { xpCost: 'asc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // REDEEM REWARD — user spends XP to claim a reward
  //
  // Rules:
  //   - Reward must be active and in stock
  //   - User must have enough XP
  //   - XP deduction + stock decrement happen atomically
  // ─────────────────────────────────────────────────────────────────
  async redeemReward(userId: string, rewardId: string) {
    const reward = await this.prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward) throw new NotFoundException('Reward not found');
    if (!reward.isActive) throw new NotFoundException('This reward is no longer available');
    if (reward.stock <= 0) throw new BadRequestException('This reward is out of stock');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xpTotal: true },
    });

    if (!user) throw new NotFoundException('User not found');

    if (user.xpTotal < reward.xpCost) {
      throw new ForbiddenException(
        `Not enough XP. You have ${user.xpTotal} XP but this reward costs ${reward.xpCost} XP`,
      );
    }

    // Deduct XP + decrement stock + create UserReward — all atomic
    const [userReward] = await this.prisma.$transaction([
      this.prisma.userReward.create({
        data: { userId, rewardId },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { xpTotal: { decrement: reward.xpCost } },
      }),
      this.prisma.reward.update({
        where: { id: rewardId },
        data: { stock: { decrement: 1 } },
      }),
    ]);

    return {
      ...userReward,
      reward: { name: reward.name, description: reward.description },
      xpSpent: reward.xpCost,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // GET MY REWARDS — rewards this user has redeemed
  // ─────────────────────────────────────────────────────────────────
  async getMyRewards(userId: string) {
    return this.prisma.userReward.findMany({
      where: { userId },
      include: {
        reward: { select: { name: true, description: true } },
      },
      orderBy: { redeemedAt: 'desc' },
    });
  }
}
