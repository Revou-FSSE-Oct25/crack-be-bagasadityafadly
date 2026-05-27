import { Injectable } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        xpTotal: true,
        level: true,
        streakCount: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  /**
   * Returns the logged-in user's profile including their active membership.
   */
  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        xpTotal: true,
        level: true,
        streakCount: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        memberships: {
          where: { status: MembershipStatus.ACTIVE },
          select: {
            id: true,
            type: true,
            status: true,
            startDate: true,
            endDate: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }
}
