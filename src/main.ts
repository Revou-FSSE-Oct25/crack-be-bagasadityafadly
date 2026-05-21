import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security headers
  app.use(helmet());

  // Gzip compression
  app.use(compression());

  // CORS — allow only the frontend origin
  app.enableCors({
    origin: configService.get<string>('frontend.url'),
    credentials: true,
  });

  // Global prefix — all routes start with /api/v1
  app.setGlobalPrefix('api/v1');

  // Global validation pipe — rejects invalid request bodies automatically
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // strips unknown properties
      forbidNonWhitelisted: true, // throws error if unknown props sent
      transform: true,       // auto-transform types (string "1" → number 1)
    }),
  );

  // Global error handler
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global response wrapper
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);

  console.log(`🚀 Server running on http://localhost:${port}/api/v1`);
}

bootstrap();