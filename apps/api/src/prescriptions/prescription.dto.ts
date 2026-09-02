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
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  page?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  limit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  dateFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  dateTo?: string;
}
