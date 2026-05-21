import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
export declare class BookingsController {
    private readonly bookingsService;
    constructor(bookingsService: BookingsService);
    create(user: {
        id: string;
    }, dto: CreateBookingDto): Promise<{
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
    getMyBookings(user: {
        id: string;
    }): Promise<{
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
    getOne(user: {
        id: string;
    }, bookingId: string): Promise<{
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
    cancel(user: {
        id: string;
    }, bookingId: string): Promise<{
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
