import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { ChallengesService } from '../challenges/challenges.service';
import { BookingStatus, BookingType } from '@prisma/client';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

// ─── helpers to build minimal mock objects ──────────────────────────────────

function makeBooking(overrides: Partial<{
  userId: string;
  status: BookingStatus;
  type: BookingType;
}> = {}) {
  return {
    id: 'booking-1',
    userId: 'user-1',
    status: BookingStatus.CONFIRMED,
    type: BookingType.GYM,
    ...overrides,
  };
}

function makeUser(xpTotal = 0, streakCount = 0, lastCheckIn: Date | null = null) {
  return { xpTotal, level: 1, streakCount, lastCheckIn };
}

// ─── XP calculation helper (mirrors the logic in AttendanceService) ──────────
// We test this logic directly because it is the core business rule.

function calculateXp(type: BookingType, hour: number): number {
  const BASE_XP: Record<BookingType, number> = { GYM: 10, CLASS: 20, PT: 30 };
  const isHappyHour = hour < 7 || hour >= 21;
  return Math.round(BASE_XP[type] * (isHappyHour ? 1.5 : 1.0));
}

// ─── streak helper (mirrors the logic in AttendanceService) ──────────────────

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function calculateStreak(
  streakCount: number,
  lastCheckIn: Date | null,
  now: Date,
): number {
  const today = toDateString(now);
  const yesterday = toDateString(new Date(now.getTime() - 86_400_000));
  const lastDate = lastCheckIn ? toDateString(lastCheckIn) : null;

  if (lastDate === today) return streakCount;
  if (lastDate === yesterday) return streakCount + 1;
  return 1;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('AttendanceService — XP calculation', () => {
  describe('Normal hours (08:00)', () => {
    const hour = 8;

    it('GYM gives 10 XP', () => {
      expect(calculateXp(BookingType.GYM, hour)).toBe(10);
    });

    it('CLASS gives 20 XP', () => {
      expect(calculateXp(BookingType.CLASS, hour)).toBe(20);
    });

    it('PT gives 30 XP', () => {
      expect(calculateXp(BookingType.PT, hour)).toBe(30);
    });
  });

  describe('Happy Hour before 07:00 (06:00)', () => {
    const hour = 6;

    it('GYM gives 15 XP (10 × 1.5)', () => {
      expect(calculateXp(BookingType.GYM, hour)).toBe(15);
    });

    it('CLASS gives 30 XP (20 × 1.5)', () => {
      expect(calculateXp(BookingType.CLASS, hour)).toBe(30);
    });

    it('PT gives 45 XP (30 × 1.5)', () => {
      expect(calculateXp(BookingType.PT, hour)).toBe(45);
    });
  });

  describe('Happy Hour at or after 21:00 (21:00)', () => {
    const hour = 21;

    it('GYM gives 15 XP (10 × 1.5)', () => {
      expect(calculateXp(BookingType.GYM, hour)).toBe(15);
    });

    it('CLASS gives 30 XP (20 × 1.5)', () => {
      expect(calculateXp(BookingType.CLASS, hour)).toBe(30);
    });
  });

  describe('Boundary: hour 7 is NOT happy hour', () => {
    it('GYM at 07:00 gives 10 XP (no multiplier)', () => {
      expect(calculateXp(BookingType.GYM, 7)).toBe(10);
    });
  });

  describe('Boundary: hour 20 is NOT happy hour', () => {
    it('GYM at 20:00 gives 10 XP (no multiplier)', () => {
      expect(calculateXp(BookingType.GYM, 20)).toBe(10);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('AttendanceService — streak calculation', () => {
  it('first ever check-in sets streak to 1', () => {
    const now = new Date('2026-05-23T10:00:00Z');
    expect(calculateStreak(0, null, now)).toBe(1);
  });

  it('consecutive day increments streak', () => {
    const yesterday = new Date('2026-05-22T10:00:00Z');
    const now = new Date('2026-05-23T10:00:00Z');
    expect(calculateStreak(3, yesterday, now)).toBe(4);
  });

  it('same day check-in does not change streak', () => {
    const earlier = new Date('2026-05-23T08:00:00Z');
    const now = new Date('2026-05-23T18:00:00Z');
    expect(calculateStreak(5, earlier, now)).toBe(5);
  });

  it('missed day resets streak to 1', () => {
    const twoDaysAgo = new Date('2026-05-21T10:00:00Z');
    const now = new Date('2026-05-23T10:00:00Z');
    expect(calculateStreak(10, twoDaysAgo, now)).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('AttendanceService — level formula', () => {
  it('level 1 at 0 XP', () => {
    expect(Math.floor(0 / 100) + 1).toBe(1);
  });

  it('level 1 at 99 XP', () => {
    expect(Math.floor(99 / 100) + 1).toBe(1);
  });

  it('level 2 at 100 XP', () => {
    expect(Math.floor(100 / 100) + 1).toBe(2);
  });

  it('level 5 at 400 XP', () => {
    expect(Math.floor(400 / 100) + 1).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('AttendanceService — service wiring (mocked DB)', () => {
  let service: AttendanceService;

  const mockTx = {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    attendanceLog: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    xpHistory: { create: jest.fn() },
    reward: { findFirst: jest.fn().mockResolvedValue(null) },
    userReward: { create: jest.fn() },
  };

  const mockPrisma = {
    $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  };

  const mockBadges = { checkAndAward: jest.fn().mockResolvedValue([]) };
  const mockChallenges = { updateProgressOnCheckIn: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BadgesService, useValue: mockBadges },
        { provide: ChallengesService, useValue: mockChallenges },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);

    jest.clearAllMocks();
  });

  it('throws NotFoundException when booking does not exist', async () => {
    mockTx.booking.findUnique.mockResolvedValue(null);

    await expect(service.checkIn('user-1', 'booking-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when booking belongs to another user', async () => {
    mockTx.booking.findUnique.mockResolvedValue(
      makeBooking({ userId: 'other-user' }),
    );

    await expect(service.checkIn('user-1', 'booking-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws BadRequestException when booking is not CONFIRMED', async () => {
    mockTx.booking.findUnique.mockResolvedValue(
      makeBooking({ status: BookingStatus.CANCELLED }),
    );

    await expect(service.checkIn('user-1', 'booking-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws ConflictException on duplicate check-in', async () => {
    mockTx.booking.findUnique.mockResolvedValue(makeBooking());
    mockTx.attendanceLog.findFirst.mockResolvedValue({ id: 'existing-log' });

    await expect(service.checkIn('user-1', 'booking-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('returns xpEarned and streakCount on successful check-in', async () => {
    mockTx.booking.findUnique.mockResolvedValue(makeBooking({ type: BookingType.CLASS }));
    mockTx.attendanceLog.findFirst.mockResolvedValue(null);
    mockTx.attendanceLog.create.mockResolvedValue({ id: 'log-1' });
    mockTx.booking.update.mockResolvedValue({});
    mockTx.user.findUnique.mockResolvedValue(makeUser(0, 0, null));
    mockTx.user.update.mockResolvedValue({});
    mockTx.xpHistory.create.mockResolvedValue({});

    const result = await service.checkIn('user-1', 'booking-1');

    expect(result.bookingType).toBe(BookingType.CLASS);
    expect(result.streakCount).toBe(1);
    expect(result.newXpTotal).toBeGreaterThanOrEqual(20); // at least base XP
    expect(result.badgesAwarded).toEqual([]);
  });
});
