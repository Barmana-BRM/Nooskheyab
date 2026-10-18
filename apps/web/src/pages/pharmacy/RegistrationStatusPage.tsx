import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, FileCheck2, FileText, Send, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { documentStatusLabel, registrationStatusLabel } from '../../lib/status';
import {
  Button,
  Card,
  Dialog,
  Empty,
  ErrorState,
  Loading,
  PageTitle,
  StatusBadge,
} from '../../components/ui';
import { useState } from 'react';

interface Registration {
  id: string;
  name: string;
  registrationStatus: string;
  reviewMessage: string | null;
  documents: Array<{
    id: string;
    documentType: string;
    originalName: string;
    verificationStatus: string;
  }>;
}
const registrationMessages: Record<string, { title: string; description: string }> = {
  DRAFT: {
    title: 'اطلاعات و مدارک را کامل کنید',
    description: 'بعد از تکمیل مشخصات و بارگذاری مجوز، ثبت‌نام را برای بررسی ارسال کنید.',
  },
  PENDING_APPROVAL: {
    title: 'ثبت‌نام شما در حال بررسی است',
    description: 'اطلاعات و مدارک ارسال شده‌اند. نتیجه بررسی در همین صفحه نمایش داده می‌شود.',
  },
  APPROVED: {
    title: 'خوش آمدید! داروخانه شما تأیید شد',
    description: 'می‌توانید درخواست‌های نسخه را ببینید و نتیجه بررسی موجودی را ثبت کنید.',
  },
  CHANGES_REQUESTED: {
    title: 'چند مورد به اصلاح نیاز دارد',
    description:
      'پیام مدیریت را بخوانید، اطلاعات یا مدارک خواسته‌شده را اصلاح و دوباره ارسال کنید.',
  },
  REJECTED: {
    title: 'ثبت‌نام تأیید نشده است',
    description:
      'دلیل بررسی را بخوانید. پس از اصلاح اطلاعات و مدارک می‌توانید دوباره درخواست دهید.',
  },
  SUSPENDED: {
    title: 'فعالیت داروخانه متوقف شده است',
    description: 'دسترسی به نسخه‌ها تا فعال‌سازی دوباره توسط مدیریت در دسترس نیست.',
  },
};
export const RegistrationStatusPage = () => {
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const queryClient = useQueryClient();
  const user = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.request<{ role: string }>('/auth/me'),
    staleTime: 60_000,
  });
  const query = useQuery({
    queryKey: ['pharmacy', 'registration'],
    queryFn: () => api.request<Registration>('/pharmacy/registration-status'),
  });
  const submit = useMutation({
    mutationFn: () => api.request('/pharmacy/submit-for-approval', { method: 'POST' }),
    onSuccess: () => {
      setConfirmSubmit(false);
      void query.refetch();
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: () => setConfirmSubmit(false),
  });
  if (query.isPending || user.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  const canManage = user.data?.role === 'PHARMACY_ADMIN';
  const canSubmit =
    canManage && ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(data.registrationStatus);
  const message = registrationMessages[data.registrationStatus] ?? registrationMessages.DRAFT;
  return (
    <>
      <PageTitle title="وضعیت ثبت‌نام داروخانه" description={data.name} />
      <Card>
        <div className="registration-result">
          <span className="soft-icon">
            <ShieldCheck size={25} aria-hidden="true" />
          </span>
          <div>
            <StatusBadge
              status={data.registrationStatus}
              label={registrationStatusLabel(data.registrationStatus)}
            />
            <h2>{message?.title}</h2>
            <p>{message?.description}</p>
          </div>
        </div>
        <ol className="timeline" aria-label="روند عضویت">
          <li className="timeline-item done">
            <span className="timeline-marker" aria-hidden="true">
              <Check size={16} />
            </span>
            ساخت حساب
          </li>
          <li className={'timeline-item' + (data.documents.length ? ' done' : '')}>
            <span className="timeline-marker" aria-hidden="true">
              <FileText size={15} />
            </span>
            تکمیل مدارک
          </li>
          <li
            className={
              'timeline-item' +
              (['PENDING_APPROVAL', 'APPROVED'].includes(data.registrationStatus) ? ' done' : '')
            }
          >
            <span className="timeline-marker" aria-hidden="true">
              <Send size={14} />
            </span>
            ارسال برای بررسی
          </li>
          <li className={'timeline-item' + (data.registrationStatus === 'APPROVED' ? ' done' : '')}>
            <span className="timeline-marker" aria-hidden="true">
              <FileCheck2 size={15} />
            </span>
            تأیید عضویت
          </li>
        </ol>
        {data.reviewMessage ? (
          <div className="notice">
            <strong>پیام مدیریت</strong>
            <p>{data.reviewMessage}</p>
          </div>
        ) : null}
        {canSubmit ? (
          <div className="form-actions">
            <Link to="/pharmacy/profile" className="btn btn-secondary">
              تکمیل اطلاعات و مدارک
              <ArrowLeft size={17} aria-hidden="true" />
            </Link>
            <Button onClick={() => setConfirmSubmit(true)} loading={submit.isPending}>
              ارسال برای بررسی
              <Send size={16} aria-hidden="true" />
            </Button>
          </div>
        ) : data.registrationStatus === 'APPROVED' ? (
          <div className="form-actions">
            <span className="muted">برای بررسی نسخه‌ها آماده‌اید.</span>
            <Link to="/pharmacy/dashboard" className="btn btn-primary">
              ورود به داشبورد
              <ArrowLeft size={17} aria-hidden="true" />
            </Link>
          </div>
        ) : null}
        {submit.isError ? (
          <div className="error-summary" role="alert">
            {submit.error instanceof Error
              ? submit.error.message
              : 'ارسال ثبت‌نام انجام نشد. دوباره تلاش کنید.'}
          </div>
        ) : null}
      </Card>
      <Card>
        <div className="card-heading">
          <div>
            <h2>مدارک ثبت‌شده</h2>
            <p>وضعیت بررسی هر مدرک را در این قسمت ببینید.</p>
          </div>
          <FileCheck2 size={22} color="var(--brand-700)" aria-hidden="true" />
        </div>
        {data.documents.length ? (
          <div className="mobile-row-list">
            {data.documents.map((document) => (
              <div className="document-row" key={document.id}>
                <FileText size={20} color="var(--brand-700)" aria-hidden="true" />
                <div className="document-row-info">
                  <strong>{document.originalName}</strong>
                </div>
                <StatusBadge
                  status={document.verificationStatus}
                  label={documentStatusLabel(document.verificationStatus)}
                />
              </div>
            ))}
          </div>
        ) : (
          <Empty>هنوز مدرکی بارگذاری نشده است.</Empty>
        )}
      </Card>
      <Dialog
        open={confirmSubmit}
        title="ارسال ثبت‌نام برای بررسی"
        onClose={() => {
          if (!submit.isPending) setConfirmSubmit(false);
        }}
      >
        <p>اطلاعات و مدارک کامل است؟ تا زمان اعلام نتیجه، امکان ویرایش اطلاعات متوقف می‌شود.</p>
        <div className="button-row">
          <Button loading={submit.isPending} onClick={() => submit.mutate()}>
            تأیید و ارسال
          </Button>
          <Button
            className="btn-secondary"
            disabled={submit.isPending}
            onClick={() => setConfirmSubmit(false)}
          >
            بازبینی اطلاعات
          </Button>
        </div>
      </Dialog>
    </>
  );
};
