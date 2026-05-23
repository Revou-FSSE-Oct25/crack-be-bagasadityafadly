import { Injectable } from '@nestjs/common';
import { GoalType, WorkoutLevel, PreferredTime } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';

// ─────────────────────────────────────────────────────────────────
// DTO — body assessment form fields (all optional so partial
// updates are allowed; user may fill it in stages)
// ─────────────────────────────────────────────────────────────────
export class SaveAssessmentDto {
  @IsOptional()
  @IsNumber()
  @Min(30) @Max(300)
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(100) @Max(250)
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(1) @Max(70)
  bodyFatPct?: number;

  @IsOptional()
  @IsEnum(GoalType)
  goal?: GoalType;

  @IsOptional()
  @IsEnum(WorkoutLevel)
  workoutLevel?: WorkoutLevel;

  @IsOptional()
  @IsEnum(PreferredTime)
  preferredTime?: PreferredTime;
}

// Difficulty order — used to determine "one level above/below"
const LEVEL_ORDER: WorkoutLevel[] = [
  WorkoutLevel.BEGINNER,
  WorkoutLevel.INTERMEDIATE,
  WorkoutLevel.ADVANCED,
];

@Injectable()
export class RecommendationsService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────
  // SAVE ASSESSMENT — stores a new body assessment for the user.
  // Each submission creates a NEW record (history, not overwrite).
  // The most recent record is always used for recommendations.
  // ─────────────────────────────────────────────────────────────────
  async saveAssessment(userId: string, dto: SaveAssessmentDto) {
    return this.prisma.bodyAssessment.create({
      data: {
        userId,
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        bodyFatPct: dto.bodyFatPct,
        goal: dto.goal,
        workoutLevel: dto.workoutLevel,
        preferredTime: dto.preferredTime,
        assessedAt: new Date(),
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // GET LATEST ASSESSMENT — returns the most recent assessment,
  // or null if the user hasn't filled one in yet.
  // Frontend uses this to decide: show modal or show recommendations.
  // ─────────────────────────────────────────────────────────────────
  async getLatestAssessment(userId: string) {
    return this.prisma.bodyAssessment.findFirst({
      where: { userId },
      orderBy: { assessedAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // GET RECOMMENDATIONS — the main engine.
  //
  // Returns:
  //   - top 3 scored classes
  //   - recovery advice based on last 7 days of activity
  //   - top challenge the user hasn't joined yet
  // ─────────────────────────────────────────────────────────────────
  async getRecommendations(userId: string) {
    // 1. Load the most recent assessment (may be null)
    const assessment = await this.prisma.bodyAssessment.findFirst({
      where: { userId },
      orderBy: { assessedAt: 'desc' },
    });

    // 2. Load all active classes
    const classes = await this.prisma.class.findMany({
      where: { isActive: true },
    });

    // 3. Load which classes the user has attended before (familiarity bonus)
    const attendedBookings = await this.prisma.booking.findMany({
      where: {
        userId,
        status: { in: ['COMPLETED', 'CONFIRMED'] },
        scheduleId: { not: null },
      },
      include: {
        schedule: { select: { classId: true } },
      },
    });
    const attendedClassIds = new Set(
      attendedBookings
        .filter((b) => b.schedule?.classId)
        .map((b) => b.schedule!.classId),
    );

    // 4. Score each class
    const scoredClasses = classes.map((cls) => {
      const score = this.scoreClass(cls, assessment, attendedClassIds);
      const reason = this.buildReason(cls, assessment);
      return { classId: cls.id, name: cls.name, difficulty: cls.difficulty, durationMinutes: cls.durationMinutes, score, reason };
    });

    // Sort by score descending, return top 3
    const topClasses = scoredClasses
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // 5. Recovery advice — based on check-ins in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCheckIns = await this.prisma.attendanceLog.count({
      where: { userId, checkedAt: { gte: sevenDaysAgo } },
    });
    const recovery = this.buildRecoveryAdvice(recentCheckIns);

    // 6. Challenge recommendation — find one the user hasn't joined yet
    const joinedChallengeIds = (
      await this.prisma.challengeProgress.findMany({
        where: { userId },
        select: { challengeId: true },
      })
    ).map((cp) => cp.challengeId);

    const suggestedChallenge = await this.prisma.challenge.findFirst({
      where: {
        isActive: true,
        id: { notIn: joinedChallengeIds.length > 0 ? joinedChallengeIds : [''] },
      },
      orderBy: { xpReward: 'asc' }, // suggest the easiest one first
    });

    return {
      hasAssessment: assessment !== null,
      classes: topClasses,
      recovery,
      challenge: suggestedChallenge
        ? {
            id: suggestedChallenge.id,
            name: suggestedChallenge.name,
            description: suggestedChallenge.description,
            xpReward: suggestedChallenge.xpReward,
            target: suggestedChallenge.target,
          }
        : null,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: SCORE CLASS
  // Calculates how well a class matches this user's profile.
  // Higher score = better match.
  // ─────────────────────────────────────────────────────────────────
  private scoreClass(
    cls: { id: string; difficulty: WorkoutLevel; durationMinutes: number },
    assessment: { goal?: GoalType | null; workoutLevel?: WorkoutLevel | null; preferredTime?: PreferredTime | null } | null,
    attendedClassIds: Set<string>,
  ): number {
    let score = 0;

    // Familiarity bonus — user has attended this class before
    if (attendedClassIds.has(cls.id)) score += 10;

    // No assessment = no personalization, return base score only
    if (!assessment) return score;

    // ── Difficulty matching ────────────────────────────────────────
    if (assessment.workoutLevel) {
      const userIdx = LEVEL_ORDER.indexOf(assessment.workoutLevel);
      const classIdx = LEVEL_ORDER.indexOf(cls.difficulty);
      const diff = classIdx - userIdx;

      if (diff === 0)  score += 30; // perfect match
      if (diff === -1) score += 15; // one level easier (good for recovery)
      if (diff === 1)  score -= 10; // one level harder (challenging but risky)
      if (diff >= 2)   score -= 25; // way too hard
    }

    // ── Goal matching ──────────────────────────────────────────────
    if (assessment.goal) {
      const fatLossFriendly: WorkoutLevel[] = [WorkoutLevel.BEGINNER, WorkoutLevel.INTERMEDIATE];
      const muscleGainFriendly: WorkoutLevel[] = [WorkoutLevel.INTERMEDIATE, WorkoutLevel.ADVANCED];

      if (assessment.goal === GoalType.FAT_LOSS && fatLossFriendly.includes(cls.difficulty)) score += 15;
      if (assessment.goal === GoalType.MUSCLE_GAIN && muscleGainFriendly.includes(cls.difficulty)) score += 15;
      if (assessment.goal === GoalType.ENDURANCE && cls.durationMinutes > 45) score += 10;
      if (assessment.goal === GoalType.FLEXIBILITY && cls.durationMinutes >= 30) score += 10;
    }

    return score;
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: BUILD REASON
  // Generates a human-readable reason string for the recommendation.
  // ─────────────────────────────────────────────────────────────────
  private buildReason(
    cls: { difficulty: WorkoutLevel; durationMinutes: number },
    assessment: { goal?: GoalType | null; workoutLevel?: WorkoutLevel | null } | null,
  ): string {
    if (!assessment) return 'Popular class at GymFlow';

    const parts: string[] = [];

    if (assessment.workoutLevel === cls.difficulty) {
      parts.push(`Matches your ${cls.difficulty} level`);
    }
    if (assessment.goal === GoalType.FAT_LOSS) {
      parts.push('Supports your FAT_LOSS goal');
    }
    if (assessment.goal === GoalType.MUSCLE_GAIN) {
      parts.push('Supports your MUSCLE_GAIN goal');
    }
    if (assessment.goal === GoalType.ENDURANCE && cls.durationMinutes > 45) {
      parts.push(`Long session (${cls.durationMinutes} min) builds endurance`);
    }

    return parts.length > 0 ? parts.join(' · ') : 'Good fit for your profile';
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: BUILD RECOVERY ADVICE
  // Generates advice based on how many times the user checked in
  // during the last 7 days.
  // ─────────────────────────────────────────────────────────────────
  private buildRecoveryAdvice(checkInsLast7Days: number): {
    advice: string;
    checkInsLast7Days: number;
  } {
    let advice: string;

    if (checkInsLast7Days === 0) {
      advice = 'No activity this week. Start small — book a GYM visit today.';
    } else if (checkInsLast7Days <= 2) {
      advice = 'Good start! Aim for 3 sessions this week to build momentum.';
    } else if (checkInsLast7Days <= 4) {
      advice = 'Great consistency! Consider adding a class to your routine.';
    } else if (checkInsLast7Days <= 6) {
      advice = 'High activity level. Make sure to schedule a rest day.';
    } else {
      advice = 'Overtraining risk detected. Take 1–2 rest days this week.';
    }

    return { advice, checkInsLast7Days };
  }
}
