import { Controller, Get, UseGuards } from '@nestjs/common';
import { BadgesService } from './badges.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  // ─────────────────────────────────────────────────────────────────
  // GET /badges
  // Public — anyone can see what badges exist in the system
  // ─────────────────────────────────────────────────────────────────
  @Get()
  getAllBadges() {
    return this.badgesService.getAllBadges();
  }

  // ─────────────────────────────────────────────────────────────────
  // GET /badges/my
  // Protected — user's own earned badges
  // ─────────────────────────────────────────────────────────────────
  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyBadges(@CurrentUser() user: { id: string }) {
    return this.badgesService.getMyBadges(user.id);
  }
}
