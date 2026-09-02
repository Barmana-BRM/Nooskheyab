import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PharmacyModule } from '../pharmacy/pharmacy.module';
import { PrescriptionModule } from '../prescriptions/prescription.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({ imports: [AuthModule, PharmacyModule, PrescriptionModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
