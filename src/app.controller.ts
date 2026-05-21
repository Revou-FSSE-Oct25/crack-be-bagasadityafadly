import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'gymflow-api',
        version: '1.0.0',
      },
    };
  }
}