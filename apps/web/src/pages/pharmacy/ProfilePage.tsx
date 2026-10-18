import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircle2, FileCheck2, FileText, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import { api } from '../../lib/api';
import { openTrustedUrl } from '../../lib/external';
import { documentStatusLabel, registrationStatusLabel } from '../../lib/status';
import {
  Button,
  Card,
  Dialog,
  Empty,
  ErrorState,
  FormSection,
  Input,
  Loading,
  PageTitle,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/ui';

interface PharmacyDocument {
  id: string;
  originalName: string;
  documentType: string;
  fileSize?: number;
  verificationStatus?: string;
}
interface Profile {
  name: string;
  technicalManager: string;
  licenseNumber: string;
  licenseExpirationDate: string;
  mobile: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  workingHours: string;
  registrationStatus: string;
  documents: PharmacyDocument[];
}
interface ProfileInput {
  pharmacyName: string;
  technicalManager: string;
  licenseNumber: string;
  licenseExpirationDate: string;
  mobile: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  workingHours: string;
}
const documentLabels: Record<string, string> = {
  PHARMACY_LICENSE: 'مجوز داروخانه',
  TECHNICAL_MANAGER_CARD: 'کارت مسئول فنی',
  OTHER: 'سایر مدارک',
};
export const ProfilePage = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['pharmacy', 'profile'],
    queryFn: () => api.request<Profile>('/pharmacy/profile'),
  });
  const form = useForm<ProfileInput>();
  const fileInput = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<
    'PHARMACY_LICENSE' | 'TECHNICAL_MANAGER_CARD' | 'OTHER'
  >('PHARMACY_LICENSE');
  const [fileError, setFileError] = useState('');
  const [documentToRemove, setDocumentToRemove] = useState<PharmacyDocument | null>(null);
  const save = useMutation({
    mutationFn: (value: ProfileInput) =>
      api.request('/pharmacy/profile', { method: 'PUT', body: JSON.stringify(value) }),
    onSuccess: () => {
      void query.refetch();
      void queryClient.invalidateQueries({ queryKey: ['pharmacy', 'registration'] });
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
  const upload = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.set('file', file);
      body.set('documentType', documentType);
      return api.request('/pharmacy/documents', { method: 'POST', body });
    },
    onSuccess: () => {
      setFileError('');
      void query.refetch();
      void queryClient.invalidateQueries({ queryKey: ['pharmacy', 'registration'] });
    },
  });
  const documentUrl = useMutation({
    mutationFn: (documentId: string) =>
      api.request<{ url: string }>(
        '/pharmacy/documents/' + encodeURIComponent(documentId) + '/url',
      ),
    onSuccess: (result) => void openTrustedUrl(result.url),
  });
  const removeDocument = useMutation({
    mutationFn: (documentId: string) =>
      api.request('/pharmacy/documents/' + encodeURIComponent(documentId), { method: 'DELETE' }),
    onSuccess: () => {
      setDocumentToRemove(null);
      void query.refetch();
      void queryClient.invalidateQueries({ queryKey: ['pharmacy', 'registration'] });
    },
  });
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  const canEditDocuments = ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(
    data.registrationStatus,
  );
  const locked = data.registrationStatus === 'PENDING_APPROVAL';
  return (
    <>
      <div className="page-heading-row">
        <PageTitle
          title="اطلاعات و مدارک داروخانه"
          description="اطلاعات تماس، نشانی و مدارک مجوز را اینجا به‌روز نگه دارید."
        />
        <StatusBadge
          status={data.registrationStatus}
          label={registrationStatusLabel(data.registrationStatus)}
        />
      </div>
      {locked ? (
        <div className="notice form-status-notice">
          اطلاعات شما در حال بررسی است و تا اعلام نتیجه، قابل ویرایش نیست.
        </div>
      ) : null}
      {data.registrationStatus === 'APPROVED' ? (
        <div className="notice notice-icon form-status-notice">
          <ShieldCheck size={19} aria-hidden="true" />
          <p>
            تغییر نام، مسئول فنی، مجوز یا نشانی به بررسی دوباره نیاز دارد و دریافت نسخه تا تأیید
            مجدد متوقف می‌شود.
          </p>
        </div>
      ) : null}
      <Card>
        <form
          onSubmit={form.handleSubmit((value) => {
            if (!save.isPending) save.mutate(value);
          })}
        >
          <fieldset
            disabled={locked || save.isPending}
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >
            <FormSection title="مشخصات داروخانه" number="۱">
              <Input
                label="نام داروخانه"
                defaultValue={data.name}
                {...form.register('pharmacyName')}
              />
              <Input
                label="مسئول فنی"
                defaultValue={data.technicalManager}
                {...form.register('technicalManager')}
              />
              <Input
                label="شماره مجوز"
                defaultValue={data.licenseNumber}
                {...form.register('licenseNumber')}
              />
              <Input
                label="تاریخ اعتبار مجوز"
                type="date"
                defaultValue={data.licenseExpirationDate.slice(0, 10)}
                {...form.register('licenseExpirationDate')}
              />
            </FormSection>
            <FormSection title="اطلاعات تماس و مراجعه" number="۲">
              <Input
                label="شماره موبایل"
                inputMode="tel"
                dir="ltr"
                defaultValue={data.mobile}
                {...form.register('mobile')}
              />
              <Input
                label="تلفن ثابت"
                inputMode="tel"
                dir="ltr"
                defaultValue={data.phone}
                {...form.register('phone')}
              />
              <Input label="استان" defaultValue={data.province} {...form.register('province')} />
              <Input label="شهر" defaultValue={data.city} {...form.register('city')} />
              <Input
                label="کد پستی"
                inputMode="numeric"
                dir="ltr"
                defaultValue={data.postalCode}
                {...form.register('postalCode')}
              />
              <Input
                label="ساعت کاری"
                defaultValue={data.workingHours}
                {...form.register('workingHours')}
              />
              <Textarea
                label="نشانی"
                className="full"
                defaultValue={data.address}
                {...form.register('address')}
              />
            </FormSection>
          </fieldset>
          {save.isError ? (
            <div className="error-summary" role="alert">
              {save.error instanceof Error ? save.error.message : 'ذخیره اطلاعات انجام نشد.'}
            </div>
          ) : null}
          {save.isSuccess ? (
            <div className="alert alert-success" role="status">
              <CheckCircle2 size={17} aria-hidden="true" /> اطلاعات داروخانه ذخیره شد.
            </div>
          ) : null}
          {!locked ? (
            <div className="form-actions">
              <span className="muted">پیش از ذخیره، اطلاعات را یک بار بررسی کنید.</span>
              <Button type="submit" loading={save.isPending}>
                ذخیره تغییرات
              </Button>
            </div>
          ) : null}
        </form>
      </Card>
      <Card>
        <div className="card-heading">
          <div>
            <h2>مدارک مجوز</h2>
            <p>تصویر خوانا از مجوز و مدارک لازم بارگذاری کنید.</p>
          </div>
          <FileCheck2 size={23} color="var(--brand-700)" aria-hidden="true" />
        </div>
        {canEditDocuments ? (
          <div className="document-upload">
            <Select
              label="نوع مدرک"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value as typeof documentType)}
            >
              <option value="PHARMACY_LICENSE">مجوز داروخانه</option>
              <option value="TECHNICAL_MANAGER_CARD">کارت مسئول فنی</option>
              <option value="OTHER">سایر مدارک</option>
            </Select>
            <div className="upload-zone">
              <UploadCloud size={27} aria-hidden="true" />
              <strong>
                {upload.isPending ? 'در حال بارگذاری مدرک…' : 'یک تصویر خوانا از مدرک انتخاب کنید'}
              </strong>
              <span>JPG، PNG یا PDF · حداکثر ۵ مگابایت</span>
              <input
                ref={fileInput}
                type="file"
                className="sr-only"
                aria-label="انتخاب فایل مدرک"
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                disabled={upload.isPending}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = '';
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    setFileError('حجم فایل نباید بیشتر از ۵ مگابایت باشد.');
                    return;
                  }
                  if (!/\.(?:jpe?g|png|pdf)$/i.test(file.name)) {
                    setFileError('لطفاً فایل JPG، PNG یا PDF انتخاب کنید.');
                    return;
                  }
                  setFileError('');
                  upload.mutate(file);
                }}
              />
              <Button
                className="btn-secondary"
                onClick={() => fileInput.current?.click()}
                loading={upload.isPending}
              >
                انتخاب فایل
              </Button>
            </div>
          </div>
        ) : (
          <div className="notice">در وضعیت فعلی، مدارک فقط قابل مشاهده هستند.</div>
        )}
        {fileError || upload.isError || documentUrl.isError || removeDocument.isError ? (
          <div className="error-summary" role="alert">
            {fileError ||
              (upload.error instanceof Error
                ? upload.error.message
                : documentUrl.error instanceof Error
                  ? documentUrl.error.message
                  : removeDocument.error instanceof Error
                    ? removeDocument.error.message
                    : 'عملیات مدرک انجام نشد. دوباره تلاش کنید.')}
          </div>
        ) : null}
        <div className="mobile-row-list" style={{ marginTop: '1.25rem' }}>
          {data.documents.length ? (
            data.documents.map((doc) => (
              <div className="document-row" key={doc.id}>
                <span className="soft-icon">
                  <FileText size={20} aria-hidden="true" />
                </span>
                <div className="document-row-info">
                  <strong>{doc.originalName}</strong>
                  <small>
                    {documentLabels[doc.documentType] ?? 'مدرک'}
                    {doc.fileSize
                      ? ' · ' + Math.ceil(doc.fileSize / 1024).toLocaleString('fa-IR') + ' کیلوبایت'
                      : ''}
                  </small>
                </div>
                <StatusBadge
                  status={doc.verificationStatus ?? 'PENDING'}
                  label={documentStatusLabel(doc.verificationStatus ?? 'PENDING')}
                />
                <div className="button-row">
                  <Button
                    className="btn-secondary"
                    onClick={() => documentUrl.mutate(doc.id)}
                    loading={documentUrl.isPending}
                  >
                    مشاهده مدرک
                  </Button>
                  {canEditDocuments ? (
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={'حذف مدرک ' + doc.originalName}
                      onClick={() => setDocumentToRemove(doc)}
                    >
                      <Trash2 size={17} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <Empty>هنوز مدرکی بارگذاری نشده است.</Empty>
          )}
        </div>
      </Card>
      <Dialog
        open={Boolean(documentToRemove)}
        title="حذف مدرک"
        onClose={() => {
          if (!removeDocument.isPending) setDocumentToRemove(null);
        }}
      >
        <p>
          مدرک «{documentToRemove?.originalName}» حذف شود؟ برای ارسال ثبت‌نام، به مدارک لازم نیاز
          دارید.
        </p>
        <div className="button-row">
          <Button
            className="btn-danger"
            loading={removeDocument.isPending}
            onClick={() => {
              if (documentToRemove) removeDocument.mutate(documentToRemove.id);
            }}
          >
            حذف مدرک
          </Button>
          <Button
            className="btn-secondary"
            disabled={removeDocument.isPending}
            onClick={() => setDocumentToRemove(null)}
          >
            بازگشت
          </Button>
        </div>
      </Dialog>
    </>
  );
};
