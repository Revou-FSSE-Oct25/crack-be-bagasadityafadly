import {
  Controller, Get, Patch, Post, Delete,
  Param, Body, Query, UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AssignMembershipDto,
  CreateClassDto,
  CreateScheduleDto,
  CreateTrainerDto,
  UpdateBookingStatusDto,
  UpdateTrainerDto,
  UpdateUserRoleDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Stats ────────────────────────────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // ── Users ────────────────────────────────────────────────────────────────

  @Get('users')
  findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Patch('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Post('users/:id/membership')
  assignMembership(@Param('id') id: string, @Body() dto: AssignMembershipDto) {
    return this.adminService.assignMembership(id, dto.type, dto.durationDays);
  }

  @Patch('users/:id/deactivate')
  deactivateUser(@Param('id') id: string) {
    return this.adminService.deactivateUser(id);
  }

  // ── Bookings ─────────────────────────────────────────────────────────────

  @Get('bookings')
  findAllBookings(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.adminService.findAllBookings(Math.min(200, limit));
  }

  @Patch('bookings/:id/status')
  updateBookingStatus(@Param('id') id: string, @Body() dto: UpdateBookingStatusDto) {
    return this.adminService.updateBookingStatus(id, dto.status);
  }

  // ── Classes ──────────────────────────────────────────────────────────────

  @Post('classes')
  createClass(@Body() dto: CreateClassDto) {
    return this.adminService.createClass(dto);
  }

  @Delete('classes/:id')
  deleteClass(@Param('id') id: string) {
    return this.adminService.deleteClass(id);
  }

  // ── Schedules ────────────────────────────────────────────────────────────

  @Get('schedules')
  findAllSchedules() {
    return this.adminService.findAllSchedules();
  }

  @Post('schedules')
  createSchedule(@Body() dto: CreateScheduleDto) {
    return this.adminService.createSchedule(dto);
  }

  @Delete('schedules/:id')
  deleteSchedule(@Param('id') id: string) {
    return this.adminService.deleteSchedule(id);
  }

  // ── Trainers ─────────────────────────────────────────────────────────────

  @Get('trainers')
  findAllTrainers() {
    return this.adminService.findAllTrainers();
  }

  @Post('trainers')
  createTrainer(@Body() dto: CreateTrainerDto) {
    return this.adminService.createTrainer(dto);
  }

  @Patch('trainers/:id')
  updateTrainer(@Param('id') id: string, @Body() dto: UpdateTrainerDto) {
    return this.adminService.updateTrainer(id, dto);
  }

  // ── Memberships ───────────────────────────────────────────────────────────

  @Get('memberships')
  findAllMemberships() {
    return this.adminService.findAllMemberships();
  }

  @Delete('memberships/:id')
  cancelMembership(@Param('id') id: string) {
    return this.adminService.cancelMembership(id);
  }
}
