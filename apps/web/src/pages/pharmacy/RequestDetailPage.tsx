import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Layers,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { z } from 'zod';
import { pharmacyResponseSchema } from '@pharmacy-mvp/validation';
import { api } from '../../lib/api';
import { formatJalaliDateTime, remainingLabel } from '../../lib/date';
import { statusLabel } from '../../lib/status';
import {
  Button,
  Card,
  ErrorState,
  Loading,
  PageTitle,
  StatusBadge,
  Textarea,
} from '../../components/ui';

type ResponseInput = z.infer<typeof pharmacyResponseSchema>;
interface Detail {
  id: string;
  publicId: string;
  status: string;
  prescriptionStatus: string;
  mobile: string;
  nationalId: string;
  prescriptionTrackingCode: string;
  baseInsurance: string;
  supplementaryInsurance: string | null;
  supplementaryDescription: string | null;
  patientDescription: string | null;
  expiresAt: string;
  sentAt: string;
  seenAt: string | null;
  response: {
    availabilityStatus: ResponseInput['availabilityStatus'];
    description: string | null;
  } | null;
  selectedPharmacyId: string | null;
}
const responseOptions = [
  {
    value: 'FULL_AVAILABLE',
    title: 'نسخه کامل موجود است',
    caption: 'همه اقلام نسخه قابل تأمین است.',
    icon: CheckCircle2,
  },
  {
    value: 'PARTIAL_AVAILABLE',
    title: 'بخشی از نسخه موجود است',
    caption: 'اقلام قابل تأمین را در توضیحات بنویسید.',
    icon: Layers,
  },
  {
    value: 'NOT_AVAILABLE',
    title: 'قابل تأمین نیست',
    caption: 'در حال حاضر امکان تأمین نسخه را نداریم.',
    icon: XCircle,
  },
] as const;
export const RequestDetailPage = () => {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);
  const query = useQuery({
    queryKey: ['pharmacy', 'request', id],
    queryFn: () => api.request<Detail>('/pharmacy/prescriptions/' + encodeURIComponent(id)),
    enabled: Boolean(id),
  });
  const form = useForm<ResponseInput>({
    resolver: zodResolver(pharmacyResponseSchema),
    defaultValues: { availabilityStatus: 'FULL_AVAILABLE', description: '' },
  });
  useEffect(() => {
    form.reset({
      availabilityStatus: query.data?.response?.availabilityStatus ?? 'FULL_AVAILABLE',
      description: query.data?.response?.description ?? '',
    });
  }, [form, query.data?.response]);
  const availability = form.watch('availabilityStatus');
  const response = useMutation({
    mutationFn: (value: ResponseInput) =>
      api.request('/pharmacy/prescriptions/' + encodeURIComponent(id) + '/respond', {
        method: 'POST',
        body: JSON.stringify(value),
      }),
    onSuccess: () => {
      void query.refetch();
      void queryClient.invalidateQueries({ queryKey: ['pharmacy', 'dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['pharmacy', 'requests'] });
    },
  });
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  const closed =
    ['EXPIRED', 'CANCELLED', 'COMPLETED', 'SELECTED_PHARMACY'].includes(data.prescriptionStatus) ||
    ['CLOSED', 'EXPIRED', 'SELECTED'].includes(data.status) ||
    new Date(data.expiresAt).getTime() <= now;
  return (
    <>
      <Link to="/pharmacy/requests" className="form-breadcrumb">
        <ArrowRight size={15} aria-hidden="true" />
        بازگشت به درخواست‌ها
      </Link>
      <div className="page-heading-row">
        <PageTitle
          title={'درخواست ' + data.publicId}
          description={'ارسال‌شده در ' + formatJalaliDateTime(data.sentAt)}
        />
        <StatusBadge
          status={data.prescriptionStatus}
          label={statusLabel(data.prescriptionStatus)}
        />
      </div>
      <div className="prescription-detail-layout">
        <Card>
          <div className="card-heading">
            <h2>اطلاعات نسخه و بیمار</h2>
            <ShieldCheck size={20} color="var(--brand-700)" aria-hidden="true" />
          </div>
          <dl className="detail-grid">
            <Item label="شماره موبایل" value={data.mobile} />
            <Item label="کد ملی" value={data.nationalId} />
            <Item label="کد رهگیری نسخه" value={data.prescriptionTrackingCode} />
            <Item label="بیمه پایه" value={data.baseInsurance} />
            <Item label="بیمه تکمیلی" value={data.supplementaryInsurance ?? 'ندارد'} />
            <Item
              label="زمان باقی‌مانده"
              value={closed ? 'بررسی این درخواست بسته است' : remainingLabel(data.expiresAt)}
            />
          </dl>
          {data.patientDescription ? (
            <div className="notice">
              <strong>توضیحات بیمار</strong>
              <p>{data.patientDescription}</p>
            </div>
          ) : null}
          {data.supplementaryDescription ? (
            <div className="notice" style={{ marginTop: '1rem' }}>
              <strong>توضیحات بیمه تکمیلی</strong>
              <p>{data.supplementaryDescription}</p>
            </div>
          ) : null}
          <p className="auth-security">
            <ShieldCheck size={15} aria-hidden="true" />
            اطلاعات این نسخه فقط برای بررسی و تأمین استفاده شود.
          </p>
        </Card>
        <Card>
          <div className="card-heading">
            <div>
              <h2>{data.response ? 'پاسخ ثبت‌شده شما' : 'نتیجه بررسی نسخه'}</h2>
              <p>
                {closed
                  ? 'این درخواست دیگر پاسخ جدید نمی‌پذیرد.'
                  : 'وضعیت موجودی را برای بیمار مشخص کنید.'}
              </p>
            </div>
            <Clock3 size={20} color="var(--brand-700)" aria-hidden="true" />
          </div>
          {!closed ? (
            <form
              onSubmit={form.handleSubmit((value) => {
                if (!response.isPending) response.mutate(value);
              })}
              noValidate
            >
              <fieldset className="response-choices">
                <legend className="sr-only">نتیجه بررسی موجودی نسخه</legend>
                {responseOptions.map((option) => (
                  <label className="response-choice" key={option.value}>
                    <input
                      type="radio"
                      value={option.value}
                      {...form.register('availabilityStatus')}
                    />
                    <option.icon size={21} aria-hidden="true" />
                    <span>
                      <strong>{option.title}</strong>
                      <small>{option.caption}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
              <Textarea
                label={
                  availability === 'PARTIAL_AVAILABLE'
                    ? 'توضیح اقلام قابل تأمین (الزامی)'
                    : 'توضیح پاسخ (اختیاری)'
                }
                placeholder={
                  availability === 'PARTIAL_AVAILABLE'
                    ? 'کدام اقلام موجود است و کدام اقلام قابل تأمین نیست؟'
                    : 'توضیحی که به بیمار برای تصمیم‌گیری کمک می‌کند.'
                }
                maxLength={1000}
                rows={3}
                {...form.register('description')}
                error={form.formState.errors.description?.message}
              />
              {response.isError ? (
                <div className="error-summary" role="alert">
                  {response.error instanceof Error
                    ? response.error.message
                    : 'ثبت پاسخ انجام نشد. دوباره تلاش کنید.'}
                </div>
              ) : null}
              {response.isSuccess ? (
                <div className="alert alert-success" role="status">
                  پاسخ شما ثبت شد و برای بیمار قابل مشاهده است.
                </div>
              ) : null}
              <div className="form-actions">
                <span className="muted" style={{ fontSize: '.75rem' }}>
                  پاسخ را پیش از ثبت بررسی کنید.
                </span>
                <Button type="submit" loading={response.isPending}>
                  {data.response ? 'ذخیره پاسخ جدید' : 'ثبت پاسخ'}
                  <ArrowLeft size={17} aria-hidden="true" />
                </Button>
              </div>
            </form>
          ) : data.response ? (
            <div>
              <StatusBadge
                status={data.response.availabilityStatus}
                label={statusLabel(data.response.availabilityStatus)}
              />
              {data.response.description ? (
                <p className="response-description" style={{ marginTop: '1rem' }}>
                  {data.response.description}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="notice">بررسی درخواست پایان یافته است.</div>
          )}
        </Card>
      </div>
    </>
  );
};
const Item = ({ label, value }: { label: string; value: string }) => (
  <div className="detail-item">
    <dt>{label}</dt>
    <dd>
      <bdi>{value}</bdi>
    </dd>
  </div>
);
