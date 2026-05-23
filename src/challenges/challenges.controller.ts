import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  // ─────────────────────────────────────────────────────────────────
  // GET /challenges
  // Public — list of all active challenges
  // ─────────────────────────────────────────────────────────────────
  @Get()
  getAllChallenges() {
    return this.challengesService.getAllChallenges();
  }

  // ─────────────────────────────────────────────────────────────────
  // GET /challenges/my
  // Protected — must be declared BEFORE /:id to avoid "my" being
  // treated as a route parameter
  // ─────────────────────────────────────────────────────────────────
  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyProgress(@CurrentUser() user: { id: string }) {
    return this.challengesService.getMyProgress(user.id);
  }

  // ─────────────────────────────────────────────────────────────────
  // POST /challenges/:id/join
  // Protected — user opts into a challenge
  // ─────────────────────────────────────────────────────────────────
  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  joinChallenge(
    @Param('id') challengeId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.challengesService.joinChallenge(user.id, challengeId);
  }
}
