import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TrainersModule } from './trainers/trainers.module';
import { ProgramsModule } from './programs/programs.module';
import { SchedulesModule } from './schedules/schedules.module';
import { BookingsModule } from './bookings/bookings.module';
import { AttendanceModule } from './attendance/attendance.module';
import { RewardsModule } from './rewards/rewards.module';

@Module({
  imports: [
    // Load .env file globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Feature modules
    AuthModule,
    TrainersModule,
    ProgramsModule,
    SchedulesModule,
    BookingsModule,
    AttendanceModule,
    RewardsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}