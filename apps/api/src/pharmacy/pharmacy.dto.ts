import { IsISO8601, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterPharmacyDto {
  @IsString() @MinLength(2) @MaxLength(100) firstName!: string;
  @IsString() @MinLength(2) @MaxLength(100) lastName!: string;
  @IsString() @MinLength(3) @MaxLength(80) username!: string;
  @IsString() @MinLength(10) @MaxLength(128) password!: string;
  @IsString() mobile!: string;
  @IsString() @MinLength(2) @MaxLength(160) pharmacyName!: string;
  @IsString() @MinLength(2) @MaxLength(160) technicalManager!: string;
  @IsOptional() @IsString() @MaxLength(30) technicalManagerIdentifier?: string;
  @IsOptional() @IsString() @MaxLength(50) pharmacyIdentifier?: string;
  @IsString() @MinLength(2) @MaxLength(80) licenseNumber!: string;
  @IsISO8601() licenseExpirationDate!: string;
  @IsString() @MaxLength(30) phone!: string;
  @IsString() @MinLength(2) @MaxLength(80) province!: string;
  @IsString() @MinLength(2) @MaxLength(80) city!: string;
  @IsString() @MinLength(5) @MaxLength(500) address!: string;
  @IsString() @MaxLength(10) postalCode!: string;
  @IsString() @MinLength(2) @MaxLength(500) workingHours!: string;
}

export class UpdatePharmacyDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) lastName?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) pharmacyName?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) technicalManager?: string;
  @IsOptional() @IsString() @MaxLength(30) technicalManagerIdentifier?: string;
  @IsOptional() @IsString() @MaxLength(50) pharmacyIdentifier?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) licenseNumber?: string;
  @IsOptional() @IsISO8601() licenseExpirationDate?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) province?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MinLength(5) @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(10) postalCode?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(500) workingHours?: string;
}

export class DocumentUploadDto {
  @IsIn(['PHARMACY_LICENSE', 'TECHNICAL_MANAGER_CARD', 'OTHER']) documentType!:
    'PHARMACY_LICENSE' | 'TECHNICAL_MANAGER_CARD' | 'OTHER';
}

export class ReviewMessageDto {
  @IsString() @MinLength(3) @MaxLength(1000) message!: string;
}
