import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { CurrentUser, Roles } from '../common/auth.decorators';
import type { AuthenticatedUser, RequestWithContext } from '../common/request-context';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { AdminDecisionDto, CreateAdminUserDto, CreateInsuranceDto, UpdateInsuranceDto, UpdateUserDto } from './admin.dto';
import type { AdminService } from './admin.service';
import type { PrescriptionListQueryDto } from '../prescriptions/prescription.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard') dashboard() { return this.admin.dashboard(); }
  @Get('prescriptions') prescriptions(@Query() query: PrescriptionListQueryDto) { return this.admin.prescriptionsList(query); }
  @Get('prescriptions/:id') prescription(@Param('id') id: string) { return this.admin.prescriptionsDetail(id); }
  @Get('pharmacy-registrations') registrations(@Query('status') status?: string) { return this.admin.registrations(status); }
  @Get('pharmacy-registrations/:id') registration(@Param('id') id: string) { return this.admin.registrationDetail(id); }
  @Post('pharmacy-registrations/:id/approve') approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: RequestWithContext) { return this.admin.reviewRegistration(id, user.id, 'APPROVED', undefined, request); }
  @Post('pharmacy-registrations/:id/reject') reject(@Param('id') id: string, @Body() body: AdminDecisionDto, @CurrentUser() user: AuthenticatedUser, @Req() request: RequestWithContext) { return this.admin.reviewRegistration(id, user.id, 'REJECTED', body.message, request); }
  @Post('pharmacy-registrations/:id/request-changes') requestChanges(@Param('id') id: string, @Body() body: AdminDecisionDto, @CurrentUser() user: AuthenticatedUser, @Req() request: RequestWithContext) { return this.admin.reviewRegistration(id, user.id, 'CHANGES_REQUESTED', body.message, request); }
  @Get('pharmacies') pharmacies() { return this.admin.pharmacies(); }
  @Post('pharmacies/:id/suspend') suspend(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: RequestWithContext) { return this.admin.suspendPharmacy(id, user.id, request); }
  @Post('pharmacies/:id/reactivate') reactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: RequestWithContext) { return this.admin.reactivatePharmacy(id, user.id, request); }
  @Delete('pharmacies/:id') delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: RequestWithContext) { return this.admin.softDeletePharmacy(id, user.id, request); }
  @Get('users') users() { return this.admin.users(); }
  @Post('users') createUser(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateAdminUserDto, @Req() request: RequestWithContext) { return this.admin.createUser(user, body, request); }
  @Put('users/:id') updateUser(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: UpdateUserDto, @Req() request: RequestWithContext) { return this.admin.updateUser(user, id, body, request); }
  @Post('users/:id/disable') disableUser(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: RequestWithContext) { return this.admin.disableUser(user.id, id, request); }
  @Post('users/:id/reset-password') resetPassword(@Param('id') id: string, @Body('password') password: string, @CurrentUser() user: AuthenticatedUser, @Req() request: RequestWithContext) { return this.admin.resetPassword(user.id, id, password, request); }
  @Get('insurance') insurance() { return this.admin.insurance(); }
  @Post('insurance') createInsurance(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateInsuranceDto, @Req() request: RequestWithContext) { return this.admin.createInsurance(user.id, body, request); }
  @Put('insurance/:id') updateInsurance(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: UpdateInsuranceDto, @Req() request: RequestWithContext) { return this.admin.updateInsurance(user.id, id, body, request); }
  @Get('audit-logs') logs(@Query() query: { action?: string; entityType?: string; requestId?: string; page?: string; limit?: string }) { return this.admin.auditLogs(query); }
}
