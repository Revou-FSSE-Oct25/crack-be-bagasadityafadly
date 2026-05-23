import { Test, TestingModule } from '@nestjs/testing';
import { XpService } from './xp.service';
import { PrismaService } from '../prisma/prisma.service';

const mockUsers = [
  { id: 'u1', name: 'Alice', xpTotal: 300, level: 4, avatarUrl: null, streakCount: 7 },
  { id: 'u2', name: 'Bob',   xpTotal: 150, level: 2, avatarUrl: null, streakCount: 3 },
  { id: 'u3', name: 'Carol', xpTotal: 50,  level: 1, avatarUrl: null, streakCount: 1 },
];

describe('XpService', () => {
  let service: XpService;
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    xpHistory: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XpService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<XpService>(XpService);
    jest.clearAllMocks();
  });

  // ── getLeaderboard ──────────────────────────────────────────────────────────

  describe('getLeaderboard', () => {
    it('adds rank starting from 1', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getLeaderboard(3);

      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
      expect(result[2].rank).toBe(3);
    });

    it('rank 1 has the highest XP', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getLeaderboard(3);

      expect(result[0].name).toBe('Alice');
      expect(result[0].xpTotal).toBe(300);
    });

    it('preserves all user fields alongside rank', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUsers[0]]);

      const [entry] = await service.getLeaderboard(1);

      expect(entry).toMatchObject({
        rank: 1,
        id: 'u1',
        name: 'Alice',
        xpTotal: 300,
        level: 4,
        streakCount: 7,
      });
    });

    it('returns empty array when no users exist', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.getLeaderboard(10);

      expect(result).toEqual([]);
    });

    it('passes limit to Prisma query', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getLeaderboard(5);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  // ── getMyXp ─────────────────────────────────────────────────────────────────

  describe('getMyXp', () => {
    it('returns merged user stats and history', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        xpTotal: 120,
        level: 2,
        streakCount: 4,
        bronzeBorderUnlocked: true,
        canApplyAsPT: false,
      });
      mockPrisma.xpHistory.findMany.mockResolvedValue([
        { source: 'ATTENDANCE', amount: 10, description: 'GYM check-in', createdAt: new Date() },
      ]);

      const result = await service.getMyXp('user-1');

      expect(result.xpTotal).toBe(120);
      expect(result.level).toBe(2);
      expect(result.bronzeBorderUnlocked).toBe(true);
      expect(result.history).toHaveLength(1);
      expect(result.history[0].source).toBe('ATTENDANCE');
    });
  });
});
