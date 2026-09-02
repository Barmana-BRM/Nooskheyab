import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreatePrescriptionDto {
  @IsString()
  mobile!: string;

  @IsString()
  nationalId!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(50)
  prescriptionTrackingCode!: string;

  @IsUUID()
  baseInsuranceId!: string;

  @IsBoolean()
  hasSupplementaryInsurance!: boolean;

  @IsOptional()
  @IsUUID()
  supplementaryInsuranceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  supplementaryDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  patientDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(0)
  honeypot?: string;
}

export class SelectPharmacyDto {
  @IsUUID()
  pharmacyId!: string;
}

export class RespondPrescriptionDto {
  @IsString()
  availabilityStatus!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class PrescriptionListQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
