import type {
  AvailabilityStatus,
  PrescriptionStatus,
  RegistrationStatus,
} from '@pharmacy-mvp/types';

export const statusLabel = (
  status: PrescriptionStatus | AvailabilityStatus | RegistrationStatus | string,
): string =>
  ({
    PENDING: 'در انتظار بررسی',
    UNDER_REVIEW: 'در حال بررسی',
    ACCEPTED: 'نسخه کامل موجود است',
    PARTIAL: 'بخشی از نسخه موجود است',
    REJECTED: 'قابل تأمین نیست',
    SELECTED_PHARMACY: 'داروخانه انتخاب شد',
    EXPIRED: 'منقضی شده',
    COMPLETED: 'تکمیل‌شده',
    CANCELLED: 'لغوشده',
    FULL_AVAILABLE: 'موجودی کامل',
    PARTIAL_AVAILABLE: 'موجودی ناقص',
    NOT_AVAILABLE: 'قابل تأمین نیست',
    DRAFT: 'پیش‌نویس',
    PENDING_APPROVAL: 'در انتظار تأیید',
    APPROVED: 'تأییدشده',
    CHANGES_REQUESTED: 'نیازمند اصلاح',
    SUSPENDED: 'معلق',
  })[status] ?? status;

export const statusClass = (status: string): string =>
  ({
    ACCEPTED: 'status-success',
    FULL_AVAILABLE: 'status-success',
    COMPLETED: 'status-success',
    PARTIAL: 'status-warning',
    PARTIAL_AVAILABLE: 'status-warning',
    REJECTED: 'status-error',
    NOT_AVAILABLE: 'status-error',
    UNDER_REVIEW: 'status-info',
    SELECTED_PHARMACY: 'status-brand',
    APPROVED: 'status-success',
    EXPIRED: 'status-muted',
    CANCELLED: 'status-muted',
    SUSPENDED: 'status-error',
  })[status] ?? 'status-neutral';
