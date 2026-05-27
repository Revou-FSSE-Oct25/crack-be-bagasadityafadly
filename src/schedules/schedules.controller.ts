import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  /**
   * GET /schedules
   * List upcoming active schedules.
   *
   * Optional query params:
   *   ?classId=<id>   — filter by class
   *   ?trainerId=<id> — filter by trainer
   *
   * Returns an array of schedule objects, each including the class info,
   * trainer info, and how many spots are still available.
   */
  @Get()
  findAll(
    @Query('classId') classId?: string,
    @Query('trainerId') trainerId?: string,
  ) {
    return this.schedulesService.findAll({ classId, trainerId });
  }
}
