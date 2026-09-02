import { Body, Controller, Delete, Get, Param, Post, Put, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles, CurrentUser } from '../common/auth.decorators';
import type { AuthenticatedUser, RequestWithContext } from '../common/request-context';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PharmacyService } from './pharmacy.service';
import { DocumentUploadDto, RegisterPharmacyDto, UpdatePharmacyDto } from './pharmacy.dto';

@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacy: PharmacyService) {}

  @Post('register')
  register(@Body() body: RegisterPharmacyDto, @Req() request: RequestWithContext) {
    return this.pharmacy.register(body, request);
  }

  @Get('registration-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN', 'PHARMACY_USER')
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.pharmacy.status(user.pharmacyId as string);
  }

  @Put('registration')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN')
  update(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdatePharmacyDto, @Req() request: RequestWithContext) {
    return this.pharmacy.update(user.pharmacyId as string, user.id, body, request);
  }

  @Post('documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  upload(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file: Express.Multer.File | undefined, @Body() body: DocumentUploadDto, @Req() request: RequestWithContext) {
    return this.pharmacy.uploadDocument(user.pharmacyId as string, user.id, file, body.documentType, request);
  }

  @Delete('documents/:documentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN')
  delete(@CurrentUser() user: AuthenticatedUser, @Param('documentId') documentId: string, @Req() request: RequestWithContext) {
    return this.pharmacy.deleteDocument(user.pharmacyId as string, documentId, user.id, request);
  }

  @Get('documents/:documentId/url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN')
  signedUrl(@CurrentUser() user: AuthenticatedUser, @Param('documentId') documentId: string) {
    return this.pharmacy.signedDocumentUrl(user.pharmacyId as string, documentId);
  }

  @Post('submit-for-approval')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN')
  submit(@CurrentUser() user: AuthenticatedUser, @Req() request: RequestWithContext) {
    return this.pharmacy.submit(user.pharmacyId as string, user.id, request);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN')
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.pharmacy.status(user.pharmacyId as string);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN')
  profileUpdate(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdatePharmacyDto, @Req() request: RequestWithContext) {
    return this.pharmacy.update(user.pharmacyId as string, user.id, body, request);
  }
}
