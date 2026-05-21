import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<{
        id: string;
        email: string;
        name: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        xpTotal: number;
        level: number;
        streakCount: number;
        lastCheckIn: Date | null;
        avatarUrl: string | null;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    findById(id: string): Promise<{
        id: string;
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        xpTotal: number;
        level: number;
        streakCount: number;
        avatarUrl: string | null;
        isActive: boolean;
        createdAt: Date;
    } | null>;
}
