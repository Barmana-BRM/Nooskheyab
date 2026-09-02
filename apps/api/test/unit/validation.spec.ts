import {
  isValidIranianNationalId,
  normalizeDigits,
  normalizeMobile,
  pharmacyResponseSchema,
  prescriptionCreateSchema,
} from '@pharmacy-mvp/validation';

describe('shared validation', () => {
  it('normalizes Persian and Arabic digits and phone separators', () => {
    expect(normalizeDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    expect(normalizeMobile('۰۹۱۲-۳۴۵ ۶۷۸۹')).toBe('09123456789');
  });

  it('validates the Iranian national id checksum', () => {
    expect(isValidIranianNationalId('0012446663')).toBe(true);
    expect(isValidIranianNationalId('0000000000')).toBe(false);
    expect(isValidIranianNationalId('0012446664')).toBe(false);
  });

  it('requires a meaningful explanation for partial availability', () => {
    expect(
      pharmacyResponseSchema.safeParse({
        availabilityStatus: 'PARTIAL_AVAILABLE',
        description: 'دارو',
      }).success,
    ).toBe(true);
    expect(
      pharmacyResponseSchema.safeParse({
        availabilityStatus: 'PARTIAL_AVAILABLE',
        description: 'نه',
      }).success,
    ).toBe(false);
  });

  it('clears supplementary values when the patient has no supplementary insurance', () => {
    const result = prescriptionCreateSchema.safeParse({
      mobile: '09123456789',
      nationalId: '0012446663',
      prescriptionTrackingCode: 'RX-1234',
      baseInsuranceId: '00000000-0000-0000-0000-000000000000',
      hasSupplementaryInsurance: false,
      supplementaryInsuranceId: '',
      supplementaryDescription: '',
      patientDescription: '',
      honeypot: '',
    });
    expect(result.success).toBe(true);
  });
});
