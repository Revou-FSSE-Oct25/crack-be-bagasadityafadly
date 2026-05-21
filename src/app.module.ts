import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import configuration from './config/configuration';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { BookingsModule } from './bookings/bookings.module';
import { TrainersModule } from './trainers/trainers.module';
import { SchedulesModule } from './schedules/schedules.module';
import { ClassesModule } from './classes/classes.module';
import { AttendanceModule } from './attendance/attendance.module';
import { RewardsModule } from './rewards/rewards.module';
import { BadgesModule } from './badges/badges.module';
import { XpModule } from './xp/xp.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChallengesModule } from './challenges/challenges.module';
import { CalendarModule } from './calendar/calendar.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    PrismaModule,

    AuthModule,
    UsersModule,
    RolesModule,
    BookingsModule,
    TrainersModule,
    SchedulesModule,
    ClassesModule,
    AttendanceModule,
    RewardsModule,
    BadgesModule,
    XpModule,
    RecommendationsModule,
    AnalyticsModule,
    NotificationsModule,
    ChallengesModule,
    CalendarModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
