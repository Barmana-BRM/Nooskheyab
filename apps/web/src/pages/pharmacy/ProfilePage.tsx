import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../lib/api';
import { openTrustedUrl } from '../../lib/external';
import { Button, Card, ErrorState, Input, Loading, PageTitle, Textarea } from '../../components/ui';

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
  documents: Array<{
    id: string;
    originalName: string;
    documentType: string;
    fileSize?: number;
    verificationStatus?: string;
  }>;
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

export const ProfilePage = () => {
  const query = useQuery({
    queryKey: ['pharmacy', 'profile'],
    queryFn: () => api.request<Profile>('/pharmacy/profile'),
  });
  const form = useForm<ProfileInput>();
  const save = useMutation({
    mutationFn: (value: ProfileInput) =>
      api.request('/pharmacy/profile', { method: 'PUT', body: JSON.stringify(value) }),
    onSuccess: () => void query.refetch(),
  });
  const [documentType, setDocumentType] = useState<
    'PHARMACY_LICENSE' | 'TECHNICAL_MANAGER_CARD' | 'OTHER'
  >('PHARMACY_LICENSE');
  const upload = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.set('file', file);
      body.set('documentType', documentType);
      return api.request('/pharmacy/documents', { method: 'POST', body });
    },
    onSuccess: () => void query.refetch(),
  });
  const documentUrl = useMutation({
    mutationFn: (documentId: string) =>
      api.request<{ url: string }>(`/pharmacy/documents/${encodeURIComponent(documentId)}/url`),
    onSuccess: (result) => void openTrustedUrl(result.url),
  });
  const removeDocument = useMutation({
    mutationFn: (documentId: string) =>
      api.request(`/pharmacy/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' }),
    onSuccess: () => void query.refetch(),
  });
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  const canEditDocuments = ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(
    data.registrationStatus,
  );
  return (
    <>
      <PageTitle
        title="پروفایل و مدارک"
        description="اطلاعات قابل ویرایش داروخانه را مدیریت کنید."
      />
      <Card>
        <form onSubmit={form.handleSubmit((value) => save.mutate(value))}>
          <div className="form-grid">
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
            <Input label="موبایل" defaultValue={data.mobile} {...form.register('mobile')} />
            <Input label="تلفن ثابت" defaultValue={data.phone} {...form.register('phone')} />
            <Input label="استان" defaultValue={data.province} {...form.register('province')} />
            <Input label="شهر" defaultValue={data.city} {...form.register('city')} />
            <Input
              label="کد پستی"
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
          </div>
          <div className="form-actions">
            <span className="muted">وضعیت: {data.registrationStatus}</span>
            <Button type="submit" loading={save.isPending}>
              ذخیره تغییرات
            </Button>
          </div>
        </form>
      </Card>
      <Card style={{ marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>مدارک مجوز</h2>
        <div className="form-grid">
          <select
            className="input"
            aria-label="نوع مدرک"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value as typeof documentType)}
          >
            <option value="PHARMACY_LICENSE">مجوز داروخانه</option>
            <option value="TECHNICAL_MANAGER_CARD">کارت مسئول فنی</option>
            <option value="OTHER">سایر</option>
          </select>
          <label className="btn btn-secondary" style={{ minHeight: 48 }}>
            انتخاب فایل
            <input
              type="file"
              hidden
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && file.size <= 5 * 1024 * 1024) upload.mutate(file);
              }}
            />
          </label>
        </div>
        {data.documents.length ? (
          <div className="mobile-row-list" style={{ marginTop: '1rem' }}>
            {data.documents.map((doc) => (
              <div className="mobile-row" key={doc.id}>
                <strong>{doc.originalName}</strong>
                <span className="muted">
                  {doc.documentType} · {doc.verificationStatus ?? 'PENDING'}
                </span>
                <Button
                  className="btn-secondary"
                  onClick={() => documentUrl.mutate(doc.id)}
                  loading={documentUrl.isPending}
                >
                  مشاهده امن مدرک
                </Button>
                {canEditDocuments ? (
                  <Button
                    className="btn-danger"
                    onClick={() => {
                      if (window.confirm('آیا از حذف این مدرک مطمئن هستید؟'))
                        removeDocument.mutate(doc.id);
                    }}
                    loading={removeDocument.isPending}
                  >
                    حذف مدرک
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">مدرکی ثبت نشده است.</p>
        )}
      </Card>
    </>
  );
};
