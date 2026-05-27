import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security headers
  app.use(helmet());

  // Gzip compression
  app.use(compression());

  // CORS — allow only the frontend origin
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL'),
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

  const config = new DocumentBuilder()
  .setTitle('Gym API')
  .setDescription('API docs')
  .setVersion('1.0')
  .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);
  
  // Global error handler
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global response wrapper
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = configService.get<number>('port') ?? 3002;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Server running on http://localhost:${port}/api/v1`);
}

bootstrap();