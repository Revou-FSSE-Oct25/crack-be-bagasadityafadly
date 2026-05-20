import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TrainersService } from './trainers.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('trainers')
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  // POST /api/trainers — Admin only
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTrainerDto) {
    return this.trainersService.create(dto);
  }

  // GET /api/trainers — Public (anyone can view trainers)
  @Get()
  findAll() {
    return this.trainersService.findAll();
  }

  // GET /api/trainers/:id — Public
  // ParseUUIDPipe validates the ID is a valid UUID before the function runs
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.trainersService.findOne(id);
  }

  // PATCH /api/trainers/:id — Admin only
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrainerDto,
  ) {
    return this.trainersService.update(id, dto);
  }

  // DELETE /api/trainers/:id — Admin only
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.trainersService.remove(id);
  }
}