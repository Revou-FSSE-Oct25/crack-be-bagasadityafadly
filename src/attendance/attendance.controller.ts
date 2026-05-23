import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Simple DTO — just the bookingId to check into
class CheckInDto {
  @IsNotEmpty({ message: 'bookingId is required' })
  @IsString()
  bookingId!: string;
}

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ─────────────────────────────────────────────────────────────────
  // POST /attendance/check-in
  // Body: { "bookingId": "..." }
  // Triggers the full gamification chain: XP → streak → badges → challenges
  // ─────────────────────────────────────────────────────────────────
  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  checkIn(
    @CurrentUser() user: { id: string },
    @Body() dto: CheckInDto,
  ) {
    return this.attendanceService.checkIn(user.id, dto.bookingId);
  }

  // ─────────────────────────────────────────────────────────────────
  // GET /attendance/my
  // User's own check-in history
  // ─────────────────────────────────────────────────────────────────
  @Get('my')
  getMyAttendance(@CurrentUser() user: { id: string }) {
    return this.attendanceService.getMyAttendance(user.id);
  }
}
