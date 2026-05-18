import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Health check endpoint — visit http://localhost:3001/api to test
  @Get()
  getHello(): object {
    return {
      status: 'ok',
      message: 'MyApp Backend is running!',
      timestamp: new Date().toISOString(),
    };
  }
}