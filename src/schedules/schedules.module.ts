import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SchedulesController],
  providers: [SchedulesService, PrismaService],
  exports: [SchedulesService],
})
export class SchedulesModule {}