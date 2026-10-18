import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileText,
  MessageSquareText,
  XCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { openTrustedUrl } from '../../lib/external';
import { documentStatusLabel, registrationStatusLabel } from '../../lib/status';
import { formatJalaliDate } from '../../lib/date';
import {
  Button,
  Card,
  Dialog,
  Empty,
  ErrorState,
  Loading,
  PageTitle,
  StatusBadge,
  Textarea,
} from '../../components/ui';
type ReviewAction = 'approve' | 'reject' | 'request-changes';
interface Registration {
  id: string;
  name: string;
  technicalManager: string;
  licenseNumber: string;
  licenseExpirationDate: string;
  mobile: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  registrationStatus: string;
  reviewMessage: string | null;
  documents: Array<{ id: string; originalName: string; verificationStatus: string }>;
}
const decisionLabels = {
  approve: 'تأیید داروخانه',
  reject: 'رد ثبت‌نام',
  'request-changes': 'درخواست اصلاح اطلاعات',
} as const;
export const RegistrationDetailPage = () => {
  const { id = '' } = useParams();
  const [message, setMessage] = useState('');
  const [decision, setDecision] = useState<ReviewAction | null>(null);
  const query = useQuery({
    queryKey: ['admin', 'registration', id],
    queryFn: () =>
      api.request<Registration>('/admin/pharmacy-registrations/' + encodeURIComponent(id)),
  });
  const review = useMutation({
    mutationFn: (action: ReviewAction) =>
      api.request('/admin/pharmacy-registrations/' + encodeURIComponent(id) + '/' + action, {
        method: 'POST',
        body: JSON.stringify(action === 'approve' ? {} : { message: message.trim() }),
      }),
    onSuccess: () => {
      setDecision(null);
      void query.refetch();
    },
  });
  const documentUrl = useMutation({
    mutationFn: (documentId: string) =>
      api.request<{ url: string }>(
        '/admin/pharmacy-registrations/' +
          encodeURIComponent(id) +
          '/documents/' +
          encodeURIComponent(documentId) +
          '/url',
      ),
    onSuccess: (data) => void openTrustedUrl(data.url),
  });
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  return (
    <>
      <Link to="/admin/pharmacy-registrations" className="form-breadcrumb">
        <ArrowRight size={15} aria-hidden="true" />
        بازگشت به ثبت‌نام‌ها
      </Link>
      <div className="page-heading-row">
        <PageTitle
          title={'بررسی ' + data.name}
          description="اطلاعات و مدارک را بررسی و نتیجه را با یک پیام روشن ثبت کنید."
        />
        <StatusBadge
          status={data.registrationStatus}
          label={registrationStatusLabel(data.registrationStatus)}
        />
      </div>
      <Card>
        <div className="card-heading">
          <h2>اطلاعات داروخانه</h2>
          <FileCheck2 size={21} color="var(--brand-700)" aria-hidden="true" />
        </div>
        <dl className="detail-grid">
          <Item label="مسئول فنی" value={data.technicalManager} />
          <Item label="شماره مجوز" value={data.licenseNumber} />
          <Item label="اعتبار مجوز" value={formatJalaliDate(data.licenseExpirationDate)} />
          <Item label="شماره موبایل" value={data.mobile} />
          <Item label="تلفن ثابت" value={data.phone} />
          <Item label="نشانی" value={data.province + '، ' + data.city + '، ' + data.address} />
        </dl>
        {data.reviewMessage ? (
          <div className="notice">
            <strong>پیام بررسی قبلی</strong>
            <p>{data.reviewMessage}</p>
          </div>
        ) : null}
      </Card>
      <Card>
        <div className="card-heading">
          <div>
            <h2>مدارک ثبت‌نام</h2>
            <p>برای مشاهده هر مدرک، دسترسی موقت صادر می‌شود.</p>
          </div>
          <FileText size={22} color="var(--brand-700)" aria-hidden="true" />
        </div>
        <div className="mobile-row-list">
          {data.documents.length ? (
            data.documents.map((doc) => (
              <div className="document-row" key={doc.id}>
                <span className="soft-icon">
                  <FileText size={21} aria-hidden="true" />
                </span>
                <div className="document-row-info">
                  <strong>{doc.originalName}</strong>
                </div>
                <StatusBadge
                  status={doc.verificationStatus}
                  label={documentStatusLabel(doc.verificationStatus)}
                />
                <Button
                  className="btn-secondary"
                  onClick={() => documentUrl.mutate(doc.id)}
                  loading={documentUrl.isPending}
                >
                  مشاهده مدرک
                </Button>
              </div>
            ))
          ) : (
            <Empty>مدرکی برای این ثبت‌نام بارگذاری نشده است.</Empty>
          )}
        </div>
        {documentUrl.isError ? (
          <div className="error-summary" role="alert">
            دریافت مدرک ممکن نشد. دوباره تلاش کنید.
          </div>
        ) : null}
      </Card>
      {data.registrationStatus === 'PENDING_APPROVAL' ? (
        <Card>
          <div className="card-heading">
            <h2>نتیجه بررسی</h2>
            <MessageSquareText size={21} color="var(--brand-700)" aria-hidden="true" />
          </div>
          <Textarea
            label="پیام برای داروخانه"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={1000}
            placeholder="برای رد یا درخواست اصلاح، دلیل و موارد مورد نیاز را روشن بنویسید."
            hint="برای رد ثبت‌نام یا درخواست اصلاح، حداقل ۳ کاراکتر توضیح الزامی است."
          />
          <div className="form-actions">
            <Button onClick={() => setDecision('approve')} disabled={review.isPending}>
              <CheckCircle2 size={17} aria-hidden="true" />
              تأیید داروخانه
            </Button>
            <div className="button-row">
              <Button
                className="btn-secondary"
                onClick={() => setDecision('request-changes')}
                disabled={review.isPending || message.trim().length < 3}
              >
                درخواست اصلاح
              </Button>
              <Button
                className="btn-danger"
                onClick={() => setDecision('reject')}
                disabled={review.isPending || message.trim().length < 3}
              >
                <XCircle size={17} aria-hidden="true" />
                رد ثبت‌نام
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
      {review.isError ? (
        <div className="error-summary" role="alert">
          {review.error instanceof Error ? review.error.message : 'ثبت نتیجه انجام نشد.'}
        </div>
      ) : null}
      <Dialog
        open={Boolean(decision)}
        title={decision ? decisionLabels[decision] : 'ثبت نتیجه'}
        onClose={() => {
          if (!review.isPending) setDecision(null);
        }}
      >
        <p>
          نتیجه «{decision ? decisionLabels[decision] : ''}» برای داروخانه «{data.name}» ثبت شود؟
        </p>
        {decision !== 'approve' ? <div className="notice">{message}</div> : null}
        <div className="button-row">
          <Button
            className={decision === 'reject' ? 'btn-danger' : ''}
            loading={review.isPending}
            onClick={() => {
              if (decision) review.mutate(decision);
            }}
          >
            تأیید و ثبت نتیجه
          </Button>
          <Button
            className="btn-secondary"
            disabled={review.isPending}
            onClick={() => setDecision(null)}
          >
            بازگشت
          </Button>
        </div>
      </Dialog>
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
