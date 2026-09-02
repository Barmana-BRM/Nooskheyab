import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../common/auth.decorators';
import { CurrentUser } from '../common/auth.decorators';
import type { AuthenticatedUser, RequestWithContext } from '../common/request-context';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ApprovedPharmacyGuard } from '../auth/approved-pharmacy.guard';
import { PrescriptionListQueryDto, RespondPrescriptionDto } from './prescription.dto';
import { PrescriptionService } from './prescription.service';

@Controller('pharmacy')
@UseGuards(JwtAuthGuard, RolesGuard, ApprovedPharmacyGuard)
@Roles('PHARMACY_ADMIN', 'PHARMACY_USER')
export class PharmacyPrescriptionController {
  constructor(private readonly prescriptions: PrescriptionService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.prescriptions.dashboard(user.pharmacyId as string);
  }

  @Get('prescriptions')
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: PrescriptionListQueryDto) {
    return this.prescriptions.listForPharmacy(user.pharmacyId as string, query);
  }

  @Get('history')
  history(@CurrentUser() user: AuthenticatedUser, @Query() query: PrescriptionListQueryDto) {
    return this.prescriptions.listForPharmacy(user.pharmacyId as string, query);
  }

  @Get('prescriptions/:id')
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Req() request: RequestWithContext) {
    return this.prescriptions.getForPharmacy(id, user.pharmacyId as string, request);
  }

  @Post('prescriptions/:id/view')
  view(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Req() request: RequestWithContext) {
    return this.prescriptions.getForPharmacy(id, user.pharmacyId as string, request);
  }

  @Post('prescriptions/:id/respond')
  respond(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: RespondPrescriptionDto, @Req() request: RequestWithContext) {
    return this.prescriptions.respond(id, user.pharmacyId as string, user.id, body, request);
  }

  @Get('notifications')
  notifications(@CurrentUser() user: AuthenticatedUser) {
    return this.prescriptions.notifications(user.pharmacyId as string);
  }

  @Post('notifications/:id/read')
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.prescriptions.markNotificationRead(id, user.pharmacyId as string);
  }
}
