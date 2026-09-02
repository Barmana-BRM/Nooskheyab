export const USER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_ADMIN', 'PHARMACY_USER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const REGISTRATION_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
  'SUSPENDED',
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const PRESCRIPTION_STATUSES = [
  'PENDING',
  'UNDER_REVIEW',
  'ACCEPTED',
  'PARTIAL',
  'REJECTED',
  'SELECTED_PHARMACY',
  'EXPIRED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number];

export const AVAILABILITY_STATUSES = [
  'FULL_AVAILABLE',
  'PARTIAL_AVAILABLE',
  'NOT_AVAILABLE',
] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export interface ApiSuccess<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
  requestId: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ListData<T> {
  items: T[];
  pagination: Pagination;
}

export interface PatientPrescriptionSummary {
  publicId: string;
  status: PrescriptionStatus;
  expiresAt: string;
  createdAt: string;
  selectedPharmacyId: string | null;
  pharmaciesCount: number;
  respondedCount: number;
  responses: PharmacyResponseView[];
}

export interface PharmacyResponseView {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  availabilityStatus: AvailabilityStatus;
  description: string | null;
  respondedAt: string;
  address: string;
  province: string;
  city: string;
  workingHours: string;
  isSelectable: boolean;
}
