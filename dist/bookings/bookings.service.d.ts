import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
export declare class BookingsService {
    private prisma;
    constructor(prisma: PrismaService);
    createBooking(userId: string, dto: CreateBookingDto): Promise<{
        trainer: {
            id: string;
            name: string;
        } | null;
        schedule: {
            trainer: {
                name: string;
            };
            class: {
                name: string;
                durationMinutes: number;
                capacity: number;
            };
            id: string;
            startTime: Date;
            endTime: Date;
            roomOrZone: string | null;
        } | null;
        id: string;
        createdAt: Date;
        type: import(".prisma/client").$Enums.BookingType;
        bookingDate: Date;
        notes: string | null;
        userId: string;
        status: import(".prisma/client").$Enums.BookingStatus;
    }>;
    getMyBookings(userId: string): Promise<{
        trainer: {
            id: string;
            name: string;
        } | null;
        schedule: {
            trainer: {
                name: string;
            };
            class: {
                name: string;
                durationMinutes: number;
                capacity: number;
            };
            id: string;
            startTime: Date;
            endTime: Date;
            roomOrZone: string | null;
        } | null;
        id: string;
        createdAt: Date;
        type: import(".prisma/client").$Enums.BookingType;
        bookingDate: Date;
        notes: string | null;
        userId: string;
        status: import(".prisma/client").$Enums.BookingStatus;
    }[]>;
    getBookingById(userId: string, bookingId: string): Promise<{
        trainer: {
            id: string;
            name: string;
        } | null;
        schedule: {
            trainer: {
                name: string;
            };
            class: {
                name: string;
                durationMinutes: number;
                capacity: number;
            };
            id: string;
            startTime: Date;
            endTime: Date;
            roomOrZone: string | null;
        } | null;
        id: string;
        createdAt: Date;
        type: import(".prisma/client").$Enums.BookingType;
        bookingDate: Date;
        notes: string | null;
        userId: string;
        status: import(".prisma/client").$Enums.BookingStatus;
    }>;
    cancelBooking(userId: string, bookingId: string): Promise<{
        trainer: {
            id: string;
            name: string;
        } | null;
        schedule: {
            trainer: {
                name: string;
            };
            class: {
                name: string;
                durationMinutes: number;
                capacity: number;
            };
            id: string;
            startTime: Date;
            endTime: Date;
            roomOrZone: string | null;
        } | null;
        id: string;
        createdAt: Date;
        type: import(".prisma/client").$Enums.BookingType;
        bookingDate: Date;
        notes: string | null;
        userId: string;
        status: import(".prisma/client").$Enums.BookingStatus;
    }>;
}
