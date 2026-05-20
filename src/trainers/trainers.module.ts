import { Module } from '@nestjs/common';
import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [TrainersController],
  providers: [TrainersService, PrismaService],
  exports: [TrainersService],  // export so other modules can use TrainersService
})
export class TrainersModule {}