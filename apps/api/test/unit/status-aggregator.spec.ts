import { aggregatePrescriptionStatus } from '../../src/prescriptions/status-aggregator';

const base = {
  cancelledAt: null,
  completedAt: null,
  selectedPharmacyId: null,
  expiresAt: new Date('2030-01-01T00:00:00Z'),
  assignmentCount: 2,
  respondedCount: 0,
  hasViewedAssignment: false,
  hasNotAvailableResponse: false,
  availabilityStatuses: [] as Array<'FULL_AVAILABLE' | 'PARTIAL_AVAILABLE' | 'NOT_AVAILABLE'>,
};

describe('aggregatePrescriptionStatus', () => {
  it('applies terminal state priority', () => {
    expect(
      aggregatePrescriptionStatus({
        ...base,
        selectedPharmacyId: 'pharmacy-id',
        cancelledAt: new Date(),
      }),
    ).toBe('CANCELLED');
    expect(aggregatePrescriptionStatus({ ...base, selectedPharmacyId: 'pharmacy-id' })).toBe(
      'SELECTED_PHARMACY',
    );
    expect(
      aggregatePrescriptionStatus({
        ...base,
        expiresAt: new Date('2020-01-01T00:00:00Z'),
        availabilityStatuses: ['FULL_AVAILABLE'],
        respondedCount: 1,
      }),
    ).toBe('EXPIRED');
  });

  it('prioritizes full over partial and partial over rejected', () => {
    expect(
      aggregatePrescriptionStatus({
        ...base,
        availabilityStatuses: ['PARTIAL_AVAILABLE'],
        respondedCount: 1,
      }),
    ).toBe('PARTIAL');
    expect(
      aggregatePrescriptionStatus({
        ...base,
        availabilityStatuses: ['PARTIAL_AVAILABLE', 'FULL_AVAILABLE'],
        respondedCount: 2,
      }),
    ).toBe('ACCEPTED');
    expect(
      aggregatePrescriptionStatus({
        ...base,
        availabilityStatuses: ['NOT_AVAILABLE', 'NOT_AVAILABLE'],
        respondedCount: 2,
      }),
    ).toBe('REJECTED');
  });

  it('returns under review after a view and pending before activity', () => {
    expect(aggregatePrescriptionStatus(base)).toBe('PENDING');
    expect(aggregatePrescriptionStatus({ ...base, hasViewedAssignment: true })).toBe(
      'UNDER_REVIEW',
    );
    expect(
      aggregatePrescriptionStatus({
        ...base,
        hasNotAvailableResponse: true,
        respondedCount: 1,
        availabilityStatuses: ['NOT_AVAILABLE'],
      }),
    ).toBe('UNDER_REVIEW');
  });
});
