import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { parseEnvironment } from '@pharmacy-mvp/config';
import { CommonModule } from './common/common.module';
import { RequestContextMiddleware } from './common/request-context.middleware';
import { AuthModule } from './auth/auth.module';
import { InsuranceModule } from './insurance/insurance.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { PrescriptionModule } from './prescriptions/prescription.module';
import { AdminModule } from './admin/admin.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: (config) => parseEnvironment(config) }),
    ScheduleModule.forRoot(),
    CommonModule,
    AuthModule,
    InsuranceModule,
    PharmacyModule,
    PrescriptionModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
