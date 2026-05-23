import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { BadgesModule } from '../badges/badges.module';
import { ChallengesModule } from '../challenges/challenges.module';

@Module({
  // AttendanceService calls BadgesService and ChallengesService,
  // so we import their modules to make those services available here.
  imports: [BadgesModule, ChallengesModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}