import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // Connect to database when the app starts
  async onModuleInit() {
    await this.$connect();
    console.log('Database connected successfully');
  }

  // Disconnect from database when the app stops
  async onModuleDestroy() {
    await this.$disconnect();
  }
}