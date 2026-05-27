import { Controller, Get, UseGuards } from '@nestjs/common';
import { TrainersService } from './trainers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('trainers')
@UseGuards(JwtAuthGuard)
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  /**
   * GET /trainers
   * List all active personal trainers.
   */
  @Get()
  findAll() {
    return this.trainersService.findAll();
  }
}
