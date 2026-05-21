import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private prisma;
    private usersService;
    private jwtService;
    constructor(prisma: PrismaService, usersService: UsersService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        user: {
            email: string;
            id: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            createdAt: Date;
        };
        access_token: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
        };
        access_token: string;
    }>;
    getMe(userId: string): Promise<{
        email: string;
        id: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        xpTotal: number;
        level: number;
        streakCount: number;
        avatarUrl: string | null;
        isActive: boolean;
        createdAt: Date;
    } | null>;
    private generateToken;
}
