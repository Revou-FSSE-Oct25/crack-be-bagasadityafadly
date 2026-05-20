import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  // POST /api/schedules — Admin only
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateScheduleDto) {
    return this.schedulesService.create(dto);
  }

  // GET /api/schedules
  // GET /api/schedules?date=2026-05-20
  // GET /api/schedules?trainerId=abc&date=2026-05-20
  // GET /api/schedules?programId=xyz
  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('trainerId') trainerId?: string,
    @Query('programId') programId?: string,
  ) {
    return this.schedulesService.findAll({ date, trainerId, programId });
  }

  // GET /api/schedules/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedulesService.findOne(id);
  }

  // PATCH /api/schedules/:id — Admin only
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(id, dto);
  }

  // DELETE /api/schedules/:id — Admin only
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedulesService.remove(id);
  }
}