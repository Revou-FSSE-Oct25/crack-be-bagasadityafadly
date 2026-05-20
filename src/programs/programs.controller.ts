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
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  // POST /api/programs
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateProgramDto) {
    return this.programsService.create(dto);
  }

  // GET /api/programs
  // GET /api/programs?category=FAT_LOSS  ← with optional filter
  @Get()
  findAll(@Query('category') category?: string) {
    return this.programsService.findAll(category);
  }

  // GET /api/programs/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.programsService.findOne(id);
  }

  // PATCH /api/programs/:id
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgramDto,
  ) {
    return this.programsService.update(id, dto);
  }

  // DELETE /api/programs/:id
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.programsService.remove(id);
  }
}