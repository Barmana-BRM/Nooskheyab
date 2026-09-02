import type { AvailabilityStatus, PrescriptionStatus } from '@prisma/client';

export interface AggregationInput {
  cancelledAt: Date | null;
  completedAt: Date | null;
  selectedPharmacyId: string | null;
  expiresAt: Date;
  assignmentCount: number;
  respondedCount: number;
  hasViewedAssignment: boolean;
  hasNotAvailableResponse: boolean;
  availabilityStatuses: AvailabilityStatus[];
}

export const aggregatePrescriptionStatus = (input: AggregationInput, now = new Date()): PrescriptionStatus => {
  if (input.cancelledAt) return 'CANCELLED';
  if (input.completedAt) return 'COMPLETED';
  if (input.selectedPharmacyId) return 'SELECTED_PHARMACY';
  if (input.expiresAt <= now) return 'EXPIRED';
  if (input.availabilityStatuses.includes('FULL_AVAILABLE')) return 'ACCEPTED';
  if (input.availabilityStatuses.includes('PARTIAL_AVAILABLE')) return 'PARTIAL';
  if (input.assignmentCount > 0 && input.respondedCount === input.assignmentCount && input.availabilityStatuses.length === input.assignmentCount) return 'REJECTED';
  if (input.hasViewedAssignment || input.hasNotAvailableResponse) return 'UNDER_REVIEW';
  return 'PENDING';
};
