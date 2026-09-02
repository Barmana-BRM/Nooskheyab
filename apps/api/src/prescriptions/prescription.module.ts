import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InsuranceModule } from '../insurance/insurance.module';
import { ExpirationService } from './expiration.service';
import { PharmacyPrescriptionController } from './pharmacy-prescription.controller';
import { PrescriptionController } from './prescription.controller';
import { PrescriptionService } from './prescription.service';

@Module({
  imports: [InsuranceModule, AuthModule],
  controllers: [PrescriptionController, PharmacyPrescriptionController],
  providers: [PrescriptionService, ExpirationService],
  exports: [PrescriptionService],
})
export class PrescriptionModule {}
