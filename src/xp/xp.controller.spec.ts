import { Test, TestingModule } from '@nestjs/testing';
import { XpController } from './xp.controller';
import { XpService } from './xp.service';

describe('XpController — leaderboard limit clamping', () => {
  let controller: XpController;
  const mockXpService = {
    getLeaderboard: jest.fn().mockResolvedValue([]),
    getMyXp: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [XpController],
      providers: [{ provide: XpService, useValue: mockXpService }],
    }).compile();

    controller = module.get<XpController>(XpController);
    jest.clearAllMocks();
  });

  it('uses default 10 when limit is not provided', async () => {
    await controller.getLeaderboard(undefined);
    expect(mockXpService.getLeaderboard).toHaveBeenCalledWith(10);
  });

  it('clamps limit above 100 down to 100', async () => {
    await controller.getLeaderboard('999');
    expect(mockXpService.getLeaderboard).toHaveBeenCalledWith(100);
  });

  it('clamps limit below 1 up to 1', async () => {
    await controller.getLeaderboard('0');
    expect(mockXpService.getLeaderboard).toHaveBeenCalledWith(1);
  });

  it('clamps negative limit up to 1', async () => {
    await controller.getLeaderboard('-5');
    expect(mockXpService.getLeaderboard).toHaveBeenCalledWith(1);
  });

  it('passes valid limit through unchanged', async () => {
    await controller.getLeaderboard('50');
    expect(mockXpService.getLeaderboard).toHaveBeenCalledWith(50);
  });

  it('clamps boundary 100 — stays at 100', async () => {
    await controller.getLeaderboard('100');
    expect(mockXpService.getLeaderboard).toHaveBeenCalledWith(100);
  });

  it('clamps boundary 1 — stays at 1', async () => {
    await controller.getLeaderboard('1');
    expect(mockXpService.getLeaderboard).toHaveBeenCalledWith(1);
  });
});
