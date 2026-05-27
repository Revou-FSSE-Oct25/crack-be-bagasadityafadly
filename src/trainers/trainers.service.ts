import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.trainer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        specialty: true,
        bio: true,
        avatarUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
