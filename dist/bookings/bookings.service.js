"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let BookingsService = class BookingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createBooking(userId, dto) {
        if (dto.type === client_1.BookingType.CLASS && !dto.scheduleId) {
            throw new common_1.BadRequestException('scheduleId is required for CLASS bookings');
        }
        if (dto.type === client_1.BookingType.PT) {
            if (!dto.scheduleId) {
                throw new common_1.BadRequestException('scheduleId is required for PT bookings');
            }
            if (!dto.trainerId) {
                throw new common_1.BadRequestException('trainerId is required for PT bookings');
            }
        }
        const bookingDate = new Date(dto.bookingDate);
        if (bookingDate <= new Date()) {
            throw new common_1.BadRequestException('Booking date must be in the future');
        }
        if (dto.type !== client_1.BookingType.GYM) {
            const activeMembership = await this.prisma.membership.findFirst({
                where: {
                    userId,
                    status: 'ACTIVE',
                    endDate: { gt: new Date() },
                },
            });
            if (!activeMembership) {
                throw new common_1.ForbiddenException('An active membership is required to book classes or PT sessions');
            }
        }
        if (dto.type === client_1.BookingType.GYM) {
            return this.prisma.booking.create({
                data: {
                    userId,
                    type: client_1.BookingType.GYM,
                    status: client_1.BookingStatus.CONFIRMED,
                    bookingDate,
                    notes: dto.notes,
                },
                select: bookingSelect,
            });
        }
        return this.prisma.$transaction(async (tx) => {
            const schedule = await tx.schedule.findUnique({
                where: { id: dto.scheduleId },
                include: {
                    class: { select: { capacity: true, name: true } },
                    trainer: { select: { id: true, name: true, isActive: true } },
                },
            });
            if (!schedule) {
                throw new common_1.NotFoundException('Schedule not found');
            }
            if (!schedule.isActive) {
                throw new common_1.BadRequestException('This session has been cancelled');
            }
            if (schedule.startTime <= new Date()) {
                throw new common_1.BadRequestException('This session has already started or ended');
            }
            if (dto.type === client_1.BookingType.PT) {
                if (schedule.trainerId !== dto.trainerId) {
                    throw new common_1.BadRequestException('The specified trainer is not assigned to this schedule');
                }
                if (!schedule.trainer.isActive) {
                    throw new common_1.BadRequestException('This trainer is not currently available');
                }
            }
            const confirmedCount = await tx.booking.count({
                where: {
                    scheduleId: dto.scheduleId,
                    status: { in: [client_1.BookingStatus.PENDING, client_1.BookingStatus.CONFIRMED] },
                },
            });
            if (confirmedCount >= schedule.class.capacity) {
                throw new common_1.ConflictException(`This session is fully booked (capacity: ${schedule.class.capacity})`);
            }
            const booking = await tx.booking.create({
                data: {
                    userId,
                    scheduleId: dto.scheduleId,
                    trainerId: dto.trainerId ?? null,
                    type: dto.type,
                    status: client_1.BookingStatus.CONFIRMED,
                    bookingDate: schedule.startTime,
                    notes: dto.notes,
                },
                select: bookingSelect,
            });
            return booking;
        });
    }
    async getMyBookings(userId) {
        return this.prisma.booking.findMany({
            where: { userId },
            select: bookingSelect,
            orderBy: { bookingDate: 'desc' },
        });
    }
    async getBookingById(userId, bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            select: bookingSelect,
        });
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.userId !== userId) {
            throw new common_1.ForbiddenException('You do not have access to this booking');
        }
        return booking;
    }
    async cancelBooking(userId, bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            select: {
                id: true,
                userId: true,
                status: true,
                bookingDate: true,
                type: true,
            },
        });
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.userId !== userId) {
            throw new common_1.ForbiddenException('You can only cancel your own bookings');
        }
        const cancellableStatuses = [client_1.BookingStatus.PENDING, client_1.BookingStatus.CONFIRMED];
        if (!cancellableStatuses.includes(booking.status)) {
            throw new common_1.BadRequestException(`Cannot cancel a booking with status: ${booking.status}`);
        }
        if (booking.bookingDate <= new Date()) {
            throw new common_1.BadRequestException('Cannot cancel a booking after the session has started');
        }
        return this.prisma.booking.update({
            where: { id: bookingId },
            data: { status: client_1.BookingStatus.CANCELLED },
            select: bookingSelect,
        });
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BookingsService);
const bookingSelect = {
    id: true,
    userId: true,
    type: true,
    status: true,
    bookingDate: true,
    notes: true,
    createdAt: true,
    schedule: {
        select: {
            id: true,
            startTime: true,
            endTime: true,
            roomOrZone: true,
            class: { select: { name: true, durationMinutes: true, capacity: true } },
            trainer: { select: { name: true } },
        },
    },
    trainer: {
        select: { id: true, name: true },
    },
};
//# sourceMappingURL=bookings.service.js.map