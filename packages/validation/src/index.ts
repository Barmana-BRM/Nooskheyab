import { z } from 'zod';

export const normalizeDigits = (value: string): string =>
  value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632));

export const normalizeMobile = (value: string): string =>
  normalizeDigits(value).replace(/[\s-]/g, '').trim();

export const normalizeNationalId = (value: string): string => normalizeDigits(value).trim();

const hasControlCharacters = (value: string): boolean =>
  [...value].some((character) => {
    const code = character.charCodeAt(0);
    return (code >= 0 && code <= 31) || code === 127;
  });

export const isValidIranianNationalId = (input: string): boolean => {
  const value = normalizeNationalId(input);
  if (!/^\d{10}$/.test(value) || /^(\d)\1{9}$/.test(value)) return false;
  const checkDigit = Number(value[9]);
  const weightedSum = value
    .slice(0, 9)
    .split('')
    .reduce((sum, digit, index) => sum + Number(digit) * (10 - index), 0);
  const remainder = weightedSum % 11;
  return remainder < 2 ? checkDigit === remainder : checkDigit === 11 - remainder;
};

export const mobileSchema = z
  .string()
  .transform(normalizeMobile)
  .refine((value) => /^09\d{9}$/.test(value), 'شماره موبایل معتبر نیست.');

export const nationalIdSchema = z
  .string()
  .transform(normalizeNationalId)
  .refine(isValidIranianNationalId, 'کد ملی معتبر نیست.');

export const prescriptionCreateSchema = z
  .object({
    mobile: mobileSchema,
    nationalId: nationalIdSchema,
    prescriptionTrackingCode: z
      .string()
      .transform((value) => normalizeDigits(value).trim())
      .pipe(
        z
          .string()
          .min(4, 'کد رهگیری نسخه حداقل ۴ کاراکتر است.')
          .max(50, 'کد رهگیری نسخه حداکثر ۵۰ کاراکتر است.')
          .refine((value) => !hasControlCharacters(value), 'کد رهگیری نسخه معتبر نیست.')
          .refine(
            (value) => /^[\p{L}\p{N}._/-]+$/u.test(value),
            'کد رهگیری نسخه فقط می‌تواند شامل حروف، عدد و خط تیره باشد.',
          ),
      ),
    baseInsuranceId: z.string().uuid('بیمه پایه را انتخاب کنید.'),
    hasSupplementaryInsurance: z.boolean(),
    supplementaryInsuranceId: z.preprocess(
      (value) => (value === '' ? null : value),
      z.string().uuid().nullable().optional(),
    ),
    supplementaryDescription: z.preprocess(
      (value) => (value === '' ? null : value),
      z.string().trim().max(500).nullable().optional(),
    ),
    patientDescription: z.string().trim().max(1000).nullable().optional(),
    honeypot: z.string().max(0).optional(),
  })
  .superRefine((value, context) => {
    if (value.hasSupplementaryInsurance && !value.supplementaryInsuranceId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supplementaryInsuranceId'],
        message: 'انتخاب بیمه تکمیلی الزامی است.',
      });
    }
    if (
      !value.hasSupplementaryInsurance &&
      (value.supplementaryInsuranceId || value.supplementaryDescription)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hasSupplementaryInsurance'],
        message: 'اطلاعات بیمه تکمیلی باید خالی باشد.',
      });
    }
  });

export type PrescriptionCreateInput = z.infer<typeof prescriptionCreateSchema>;

export const pharmacyResponseSchema = z
  .object({
    availabilityStatus: z.enum(['FULL_AVAILABLE', 'PARTIAL_AVAILABLE', 'NOT_AVAILABLE']),
    description: z.string().trim().max(1000).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (
      value.availabilityStatus === 'PARTIAL_AVAILABLE' &&
      (!value.description || value.description.length < 3)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: 'برای پاسخ ناقص، توضیح حداقل ۳ کاراکتری الزامی است.',
      });
    }
  });

export const loginSchema = z.object({
  username: z.string().trim().min(3).max(80),
  password: z.string().min(10).max(128),
});

export const pharmacyRegistrationSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  username: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(10).max(128),
  mobile: mobileSchema,
  pharmacyName: z.string().trim().min(2).max(160),
  technicalManager: z.string().trim().min(2).max(160),
  technicalManagerIdentifier: z.string().trim().max(30).nullable().optional(),
  pharmacyIdentifier: z.string().trim().max(50).nullable().optional(),
  licenseNumber: z.string().trim().min(2).max(80),
  licenseExpirationDate: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'تاریخ اعتبار معتبر نیست.'),
  phone: z.string().trim().max(30),
  province: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(500),
  postalCode: z
    .string()
    .transform((value) => normalizeDigits(value).trim())
    .pipe(z.string().regex(/^\d{10}$/, 'کد پستی باید ۱۰ رقم باشد.')),
  workingHours: z.string().trim().min(2).max(500),
});

export const safeSearchSchema = z.string().trim().max(100).optional();

export const isCommonPassword = (value: string): boolean =>
  new Set(['1234567890', 'password123', 'qwertyuiop', 'abcdefghij', '123456789a']).has(
    value.toLowerCase(),
  );
