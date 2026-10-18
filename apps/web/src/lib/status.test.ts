import { describe, expect, it } from 'vitest';
import type { AvailabilityStatus, PharmacyResponseView } from '@pharmacy-mvp/types';
import {
  documentStatusLabel,
  registrationStatusLabel,
  sortPharmacyResponses,
  statusClass,
  statusLabel,
} from './status';

const response = (availabilityStatus: AvailabilityStatus): PharmacyResponseView => ({
  id: availabilityStatus,
  pharmacyId: availabilityStatus,
  pharmacyName: 'داروخانه آزمون',
  availabilityStatus,
  description: null,
  respondedAt: '2026-10-18T07:00:00.000Z',
  address: 'نشانی آزمون',
  province: 'تهران',
  city: 'تهران',
  workingHours: '۹ تا ۲۱',
  isSelectable: availabilityStatus !== 'NOT_AVAILABLE',
});

describe('status presentation', () => {
  it('uses explicit Persian labels and semantic classes', () => {
    expect(statusLabel('FULL_AVAILABLE')).toBe('موجودی کامل');
    expect(statusClass('PARTIAL')).toBe('status-warning');
    expect(statusClass('NOT_AVAILABLE')).toBe('status-error');
  });

  it('sorts full, partial and unavailable results without mutating server state', () => {
    const responses = [
      response('NOT_AVAILABLE'),
      response('PARTIAL_AVAILABLE'),
      response('FULL_AVAILABLE'),
    ];
    expect(sortPharmacyResponses(responses).map((item) => item.availabilityStatus)).toEqual([
      'FULL_AVAILABLE',
      'PARTIAL_AVAILABLE',
      'NOT_AVAILABLE',
    ]);
    expect(responses[0]?.availabilityStatus).toBe('NOT_AVAILABLE');
  });

  it('distinguishes registration and document rejection from prescription availability', () => {
    expect(registrationStatusLabel('REJECTED')).toBe('ثبت‌نام تأیید نشد');
    expect(registrationStatusLabel('CHANGES_REQUESTED')).toBe('نیازمند اصلاح');
    expect(documentStatusLabel('REJECTED')).toBe('مدرک تأیید نشد');
    expect(statusLabel('REJECTED')).toBe('قابل تأمین نیست');
  });
});
