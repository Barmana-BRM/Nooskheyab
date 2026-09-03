import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AdminDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

export class CreateAdminUserDto {
  @IsString() @MinLength(2) @MaxLength(100) firstName!: string;
  @IsString() @MinLength(2) @MaxLength(100) lastName!: string;
  @IsString() @MinLength(3) @MaxLength(80) @Matches(/^[a-zA-Z0-9_.-]+$/) username!: string;
  @IsString() @MinLength(10) @MaxLength(128) password!: string;
  @IsString() mobile!: string;
  @IsIn(['ADMIN', 'SUPER_ADMIN', 'PHARMACY_ADMIN', 'PHARMACY_USER']) role!:
    'ADMIN' | 'SUPER_ADMIN' | 'PHARMACY_ADMIN' | 'PHARMACY_USER';
  @IsOptional() @IsUUID() pharmacyId?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsIn(['ADMIN', 'SUPER_ADMIN', 'PHARMACY_ADMIN', 'PHARMACY_USER']) role?:
    'ADMIN' | 'SUPER_ADMIN' | 'PHARMACY_ADMIN' | 'PHARMACY_USER';
}

export class CreateInsuranceDto {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsIn(['BASE', 'SUPPLEMENTARY']) type!: 'BASE' | 'SUPPLEMENTARY';
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateInsuranceDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(10_000) sortOrder?: number;
}

export class ResetPasswordDto {
  @IsString() @MinLength(10) @MaxLength(128) password!: string;
}

export class CreateAdminPharmacyDto {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsString() @MinLength(2) @MaxLength(160) technicalManager!: string;
  @IsOptional() @IsString() @MaxLength(30) technicalManagerIdentifier?: string;
  @IsOptional() @IsString() @MaxLength(50) pharmacyIdentifier?: string;
  @IsString() @MinLength(2) @MaxLength(80) licenseNumber!: string;
  @IsISO8601() licenseExpirationDate!: string;
  @IsString() mobile!: string;
  @IsString() @MaxLength(30) phone!: string;
  @IsString() @MinLength(2) @MaxLength(80) province!: string;
  @IsString() @MinLength(2) @MaxLength(80) city!: string;
  @IsString() @MinLength(5) @MaxLength(500) address!: string;
  @IsString() @MaxLength(10) postalCode!: string;
  @IsString() @MinLength(2) @MaxLength(500) workingHours!: string;
}

export class AuditLogQueryDto {
  @IsOptional() @IsString() @MaxLength(80) action?: string;
  @IsOptional() @IsString() @MaxLength(80) entityType?: string;
  @IsOptional() @IsString() @MaxLength(80) actor?: string;
  @IsOptional() @IsString() @MaxLength(100) requestId?: string;
  @IsOptional() @IsISO8601() dateFrom?: string;
  @IsOptional() @IsISO8601() dateTo?: string;
  @IsOptional() @IsString() @MaxLength(30) page?: string;
  @IsOptional() @IsString() @MaxLength(30) limit?: string;
}
