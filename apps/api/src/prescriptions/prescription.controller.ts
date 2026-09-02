import { Body, Controller, Headers, Param, Post, Get, Req } from '@nestjs/common';
import type { RequestWithContext } from '../common/request-context';
import { PUBLIC_TOKEN_HEADER } from '../common/constants';
import type { CreatePrescriptionDto, SelectPharmacyDto } from './prescription.dto';
import type { PrescriptionService } from './prescription.service';

@Controller('prescriptions')
export class PrescriptionController {
  constructor(private readonly prescriptions: PrescriptionService) {}

  @Post()
  create(@Body() body: CreatePrescriptionDto, @Req() request: RequestWithContext) {
    return this.prescriptions.create(body, request);
  }

  @Get(':publicId')
  get(@Param('publicId') publicId: string, @Headers(PUBLIC_TOKEN_HEADER) token?: string) {
    return this.prescriptions.getPublic(publicId, token);
  }

  @Post(':publicId/select-pharmacy')
  select(@Param('publicId') publicId: string, @Body() body: SelectPharmacyDto, @Headers(PUBLIC_TOKEN_HEADER) token: string | undefined, @Req() request: RequestWithContext) {
    return this.prescriptions.selectPharmacy(publicId, token, body.pharmacyId, request);
  }

  @Post(':publicId/cancel')
  cancel(@Param('publicId') publicId: string, @Headers(PUBLIC_TOKEN_HEADER) token: string | undefined, @Req() request: RequestWithContext) {
    return this.prescriptions.cancel(publicId, token, request);
  }

  @Post(':publicId/complete')
  complete(@Param('publicId') publicId: string, @Headers(PUBLIC_TOKEN_HEADER) token: string | undefined, @Req() request: RequestWithContext) {
    return this.prescriptions.complete(publicId, token, request);
  }
}
