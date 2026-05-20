import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { ProgramCategory } from '@prisma/client';

@Injectable()
export class ProgramsService {
  constructor(private prisma: PrismaService) {}

  // ─── CREATE ──────────────────────────────────────────────────────────
  async create(dto: CreateProgramDto) {
    const existing = await this.prisma.program.findFirst({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('A program with this name already exists');
    }

    return this.prisma.program.create({
      data: dto,
    });
  }

  // ─── FIND ALL ─────────────────────────────────────────────────────────
  // Optional filter by category: GET /api/programs?category=FAT_LOSS
  async findAll(category?: string) {
    return this.prisma.program.findMany({
      where: {
        isActive: true,
        // Only add category filter if it was provided in the query
        ...(category && { category: category as ProgramCategory }),
      },
      include: {
        _count: {
          select: { schedules: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ─── FIND ONE ─────────────────────────────────────────────────────────
  async findOne(id: string) {
    const program = await this.prisma.program.findUnique({
      where: { id },
      include: {
        schedules: {
          where: {
            status: 'ACTIVE',
            startTime: { gte: new Date() },
          },
          include: {
            trainer: {
              select: { id: true, name: true, speciality: true, avatarUrl: true },
            },
          },
          orderBy: { startTime: 'asc' },
          take: 10,
        },
        _count: {
          select: { schedules: true },
        },
      },
    });

    if (!program) {
      throw new NotFoundException(`Program with ID "${id}" not found`);
    }

    return program;
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateProgramDto) {
    await this.findOne(id);

    return this.prisma.program.update({
      where: { id },
      data: dto,
    });
  }

  // ─── DELETE (soft) ────────────────────────────────────────────────────
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.program.update({
      where: { id },
      data: { isActive: false },
    });
  }
}