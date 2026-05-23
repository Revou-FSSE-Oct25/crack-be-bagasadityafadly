import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { RecommendationsService, SaveAssessmentDto } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  // ─────────────────────────────────────────────────────────────────
  // POST /recommendations/assessment
  // User submits their body assessment (optional, from dashboard modal)
  // ─────────────────────────────────────────────────────────────────
  @Post('assessment')
  saveAssessment(
    @CurrentUser() user: { id: string },
    @Body() dto: SaveAssessmentDto,
  ) {
    return this.recommendationsService.saveAssessment(user.id, dto);
  }

  // ─────────────────────────────────────────────────────────────────
  // GET /recommendations/assessment
  // Returns most recent assessment — frontend checks this first.
  // Returns null (not 404) when no assessment exists yet.
  // ─────────────────────────────────────────────────────────────────
  @Get('assessment')
  getAssessment(@CurrentUser() user: { id: string }) {
    return this.recommendationsService.getLatestAssessment(user.id);
  }

  // ─────────────────────────────────────────────────────────────────
  // GET /recommendations/me
  // Main endpoint — returns personalized class + recovery + challenge
  // ─────────────────────────────────────────────────────────────────
  @Get('me')
  getRecommendations(@CurrentUser() user: { id: string }) {
    return this.recommendationsService.getRecommendations(user.id);
  }
}
