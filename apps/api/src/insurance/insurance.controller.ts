import { Controller, Get } from '@nestjs/common';
import type { InsuranceService } from './insurance.service';

@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insurance: InsuranceService) {}

  @Get('base')
  base() {
    return this.insurance.list('BASE');
  }

  @Get('supplementary')
  supplementary() {
    return this.insurance.list('SUPPLEMENTARY');
  }
}
