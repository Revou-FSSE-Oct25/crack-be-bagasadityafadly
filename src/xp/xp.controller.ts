import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { XpService } from './xp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('xp')
export class XpController {
  constructor(private readonly xpService: XpService) {}

  // ─────────────────────────────────────────────────────────────────
  // GET /xp/my
  // Protected — user's own XP summary and history
  // ─────────────────────────────────────────────────────────────────
  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyXp(@CurrentUser() user: { id: string }) {
    return this.xpService.getMyXp(user.id);
  }

  // ─────────────────────────────────────────────────────────────────
  // GET /xp/leaderboard?limit=10
  // Public — anyone can see the leaderboard
  // ─────────────────────────────────────────────────────────────────
  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.xpService.getLeaderboard(parsedLimit);
  }
}
