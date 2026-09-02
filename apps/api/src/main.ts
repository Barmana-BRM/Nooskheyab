import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json } from 'express';
import type { AppEnvironment } from '@pharmacy-mvp/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/exception.filter';
import { ResponseEnvelopeInterceptor } from './common/response.interceptor';
import { StructuredLogger } from './common/structured-logger';
import { RolesGuard } from './auth/roles.guard';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<AppEnvironment, true>);
  const logger = app.get(StructuredLogger);
  app.useLogger(logger);
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.use(json({ limit: '1mb' }));
  app.use(helmet({ contentSecurityPolicy: config.get('NODE_ENV') === 'production' }));
  const origins = config.get('CORS_ALLOWED_ORIGINS').split(',').map((origin) => origin.trim()).filter(Boolean);
  app.enableCors({ origin: origins, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Prescription-Token', 'Idempotency-Key', 'X-Client-Platform', 'X-Request-Id'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true, errorHttpStatusCode: 422 }));
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalGuards(app.get(RolesGuard));
  if (config.get('SWAGGER_ENABLED')) {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('سامانه نسخه دارویی').setDescription('REST API نسخه MVP').setVersion('1.0').addBearerAuth().build());
    SwaggerModule.setup('docs', app, document, { swaggerOptions: { persistAuthorization: false } });
  }
  await app.listen(config.get('PORT'), '0.0.0.0');
}

bootstrap().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Application failed to start'}\n`);
  process.exitCode = 1;
});
