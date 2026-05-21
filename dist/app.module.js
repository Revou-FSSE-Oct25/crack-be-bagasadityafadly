"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const configuration_1 = __importDefault(require("./config/configuration"));
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const roles_module_1 = require("./roles/roles.module");
const bookings_module_1 = require("./bookings/bookings.module");
const trainers_module_1 = require("./trainers/trainers.module");
const schedules_module_1 = require("./schedules/schedules.module");
const classes_module_1 = require("./classes/classes.module");
const attendance_module_1 = require("./attendance/attendance.module");
const rewards_module_1 = require("./rewards/rewards.module");
const badges_module_1 = require("./badges/badges.module");
const xp_module_1 = require("./xp/xp.module");
const recommendations_module_1 = require("./recommendations/recommendations.module");
const analytics_module_1 = require("./analytics/analytics.module");
const notifications_module_1 = require("./notifications/notifications.module");
const challenges_module_1 = require("./challenges/challenges.module");
const calendar_module_1 = require("./calendar/calendar.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            roles_module_1.RolesModule,
            bookings_module_1.BookingsModule,
            trainers_module_1.TrainersModule,
            schedules_module_1.SchedulesModule,
            classes_module_1.ClassesModule,
            attendance_module_1.AttendanceModule,
            rewards_module_1.RewardsModule,
            badges_module_1.BadgesModule,
            xp_module_1.XpModule,
            recommendations_module_1.RecommendationsModule,
            analytics_module_1.AnalyticsModule,
            notifications_module_1.NotificationsModule,
            challenges_module_1.ChallengesModule,
            calendar_module_1.CalendarModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map