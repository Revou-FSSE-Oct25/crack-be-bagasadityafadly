import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  // ─────────────────────────────────────────────────────────────────
  // GET /rewards
  // Public — anyone can browse available rewards
  // ─────────────────────────────────────────────────────────────────
  @Get()
  getAllRewards() {
    return this.rewardsService.getAllRewards();
  }

  // ─────────────────────────────────────────────────────────────────
  // GET /rewards/my
  // Protected — rewards this user has redeemed
  // Declared BEFORE /:id so "my" is not treated as a param
  // ─────────────────────────────────────────────────────────────────
  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyRewards(@CurrentUser() user: { id: string }) {
    return this.rewardsService.getMyRewards(user.id);
  }

  // ─────────────────────────────────────────────────────────────────
  // POST /rewards/:id/redeem
  // Protected — spend XP to claim a reward
  // ─────────────────────────────────────────────────────────────────
  @Post(':id/redeem')
  @UseGuards(JwtAuthGuard)
  redeemReward(
    @Param('id') rewardId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.rewardsService.redeemReward(user.id, rewardId);
  }
}
