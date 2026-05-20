import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';

@Injectable()
export class TrainersService {
  constructor(private prisma: PrismaService) {}

  // ─── CREATE ──────────────────────────────────────────────────────────
  async create(dto: CreateTrainerDto) {
    // Check if a trainer with this email already exists
    const existing = await this.prisma.trainer.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('A trainer with this email already exists');
    }

    return this.prisma.trainer.create({
      data: dto,
    });
  }

  // ─── FIND ALL ─────────────────────────────────────────────────────────
  async findAll() {
    return this.prisma.trainer.findMany({
      where: { isActive: true },
      include: {
        // _count gives us the number of related records without loading them all
        _count: {
          select: { schedules: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ─── FIND ONE ─────────────────────────────────────────────────────────
  async findOne(id: string) {
    const trainer = await this.prisma.trainer.findUnique({
      where: { id },
      include: {
        // Include upcoming schedules with program info
        schedules: {
          where: {
            status: 'ACTIVE',
            startTime: { gte: new Date() },  // only future schedules
          },
          include: {
            program: {
              select: { id: true, name: true, category: true, duration: true },
            },
          },
          orderBy: { startTime: 'asc' },
          take: 10,  // limit to 10 upcoming classes
        },
        _count: {
          select: { schedules: true },
        },
      },
    });

    if (!trainer) {
      throw new NotFoundException(`Trainer with ID "${id}" not found`);
    }

    return trainer;
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateTrainerDto) {
    await this.findOne(id);  // throws NotFoundException if not found

    return this.prisma.trainer.update({
      where: { id },
      data: dto,
    });
  }

  // ─── DELETE (soft) ────────────────────────────────────────────────────
  // We don't actually delete — we just mark isActive = false
  // This preserves history (their past schedules still exist)
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.trainer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}