import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS so your frontend (localhost:3000) can talk to backend (localhost:3001)
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Enable automatic input validation using class-validator decorators
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error if unknown properties sent
      transform: true,       // Auto-convert types (e.g. string "1" → number 1)
    }),
  );

  // Set global prefix — all routes will start with /api (e.g. /api/users)
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`Backend running on: http://localhost:${port}`);
  console.log(`API base URL: http://localhost:${port}/api`);
}

bootstrap();