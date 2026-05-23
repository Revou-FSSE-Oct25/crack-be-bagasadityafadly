import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ChallengeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChallengesService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────
  // GET ALL CHALLENGES — public list of active challenges
  // ─────────────────────────────────────────────────────────────────
  async getAllChallenges() {
    return this.prisma.challenge.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // JOIN CHALLENGE — user opts into a challenge
  // Creates a ChallengeProgress row with status IN_PROGRESS
  // ─────────────────────────────────────────────────────────────────
  async joinChallenge(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) throw new NotFoundException('Challenge not found');
    if (!challenge.isActive) throw new NotFoundException('This challenge is no longer active');

    // Check if already joined (the @@unique([userId, challengeId]) also guards this)
    const existing = await this.prisma.challengeProgress.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
    });
    if (existing) throw new ConflictException('You have already joined this challenge');

    return this.prisma.challengeProgress.create({
      data: {
        userId,
        challengeId,
        status: ChallengeStatus.IN_PROGRESS,
        progress: 0,
        startedAt: new Date(),
      },
      include: {
        challenge: {
          select: { name: true, target: true, xpReward: true, durationDays: true },
        },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // GET MY PROGRESS — user's progress on all their challenges
  // ─────────────────────────────────────────────────────────────────
  async getMyProgress(userId: string) {
    return this.prisma.challengeProgress.findMany({
      where: { userId },
      include: {
        challenge: {
          select: {
            name: true,
            description: true,
            target: true,
            xpReward: true,
            durationDays: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // UPDATE PROGRESS ON CHECK-IN
  // Called automatically after every attendance check-in.
  // Increments progress on all IN_PROGRESS challenges.
  // When progress reaches target → marks as COMPLETED.
  // ─────────────────────────────────────────────────────────────────
  async updateProgressOnCheckIn(userId: string): Promise<void> {
    const activeProgress = await this.prisma.challengeProgress.findMany({
      where: {
        userId,
        status: ChallengeStatus.IN_PROGRESS,
      },
      include: { challenge: true },
    });

    for (const cp of activeProgress) {
      const newProgress = cp.progress + 1;
      const isCompleted = newProgress >= cp.challenge.target;

      await this.prisma.challengeProgress.update({
        where: { id: cp.id },
        data: {
          progress: newProgress,
          status: isCompleted ? ChallengeStatus.COMPLETED : ChallengeStatus.IN_PROGRESS,
          completedAt: isCompleted ? new Date() : undefined,
        },
      });
    }
  }
}
