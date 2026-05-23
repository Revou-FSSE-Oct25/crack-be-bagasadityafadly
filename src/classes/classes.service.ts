import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.class.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        difficulty: true,
        durationMinutes: true,
        capacity: true,
        caloriesEstimate: true,
        isActive: true,
      },
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
