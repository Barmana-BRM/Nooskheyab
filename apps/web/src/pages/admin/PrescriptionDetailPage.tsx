import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatJalaliDateTime, remainingLabel } from '../../lib/date';
import { statusLabel } from '../../lib/status';
import { Card, ErrorState, Empty, Loading, PageTitle, StatusBadge } from '../../components/ui';

interface Assignment {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  status: string;
  sentAt: string;
  seenAt: string | null;
}

interface ResponseRow {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  availabilityStatus: string;
  description: string | null;
  respondedAt: string;
  respondedBy: string;
}

interface PrescriptionDetail {
  id: string;
  publicId: string;
  status: string;
  mobile: string;
  nationalId: string;
  prescriptionTrackingCode: string;
  baseInsurance: string;
  supplementaryInsurance: string | null;
  hasSupplementaryInsurance: boolean;
  supplementaryDescription: string | null;
  patientDescription: string | null;
  createdAt: string;
  expiresAt: string;
  selectedPharmacy: { id: string; name: string } | null;
  assignments: Assignment[];
  responses: ResponseRow[];
}

export const AdminPrescriptionDetailPage = () => {
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['admin', 'prescription', id],
    queryFn: () =>
      api.request<PrescriptionDetail>(`/admin/prescriptions/${encodeURIComponent(id)}`),
    enabled: Boolean(id),
  });

  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  const closed = ['EXPIRED', 'CANCELLED', 'COMPLETED', 'SELECTED_PHARMACY'].includes(data.status);

  return (
    <>
      <PageTitle
        title={`جزئیات درخواست ${data.publicId}`}
        description={`ثبت‌شده در ${formatJalaliDateTime(data.createdAt)}`}
      />
      <Card>
        <div className="button-row" style={{ justifyContent: 'space-between' }}>
          <StatusBadge status={data.status} label={statusLabel(data.status)} />
          <span className="muted">
            {closed ? statusLabel(data.status) : `اعتبار: ${remainingLabel(data.expiresAt)}`}
          </span>
        </div>
        <dl className="detail-grid" style={{ marginTop: '1rem' }}>
          <Item label="شماره موبایل" value={data.mobile} />
          <Item label="کد ملی" value={data.nationalId} />
          <Item label="کد رهگیری نسخه" value={data.prescriptionTrackingCode} />
          <Item label="بیمه پایه" value={data.baseInsurance} />
          <Item
            label="بیمه تکمیلی"
            value={data.hasSupplementaryInsurance ? (data.supplementaryInsurance ?? '—') : 'ندارد'}
          />
          <Item label="توضیحات بیمه" value={data.supplementaryDescription ?? '—'} />
          <Item label="توضیحات بیمار" value={data.patientDescription ?? '—'} />
          <Item label="داروخانه منتخب" value={data.selectedPharmacy?.name ?? 'انتخاب نشده'} />
        </dl>
      </Card>

      <Card style={{ marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>وضعیت ارسال به داروخانه‌ها</h2>
        {data.assignments.length ? (
          <div className="mobile-row-list">
            {data.assignments.map((assignment) => (
              <div className="mobile-row" key={assignment.id}>
                <div className="button-row" style={{ justifyContent: 'space-between' }}>
                  <strong>{assignment.pharmacyName}</strong>
                  <StatusBadge
                    status={assignment.status}
                    label={assignmentStatusLabel(assignment.status)}
                  />
                </div>
                <span className="muted">ارسال: {formatJalaliDateTime(assignment.sentAt)}</span>
                {assignment.seenAt ? (
                  <span className="muted">مشاهده: {formatJalaliDateTime(assignment.seenAt)}</span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <Empty>برای این درخواست داروخانه‌ای تخصیص داده نشده است.</Empty>
        )}
      </Card>

      <Card style={{ marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>پاسخ‌ها</h2>
        {data.responses.length ? (
          <div className="mobile-row-list">
            {data.responses.map((response) => (
              <div className="mobile-row" key={response.id}>
                <div className="button-row" style={{ justifyContent: 'space-between' }}>
                  <strong>{response.pharmacyName}</strong>
                  <StatusBadge
                    status={response.availabilityStatus}
                    label={statusLabel(response.availabilityStatus)}
                  />
                </div>
                <p style={{ margin: 0 }}>{response.description ?? 'بدون توضیح'}</p>
                <span className="muted">
                  {formatJalaliDateTime(response.respondedAt)} · ثبت توسط {response.respondedBy}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty>هنوز پاسخی ثبت نشده است.</Empty>
        )}
      </Card>
    </>
  );
};

const Item = ({ label, value }: { label: string; value: string }) => (
  <div className="detail-item">
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

const assignmentStatusLabel = (status: string): string =>
  ({
    SENT: 'ارسال‌شده',
    VIEWED: 'مشاهده‌شده',
    RESPONDED: 'پاسخ‌داده‌شده',
    SELECTED: 'منتخب',
    CLOSED: 'بسته‌شده',
    EXPIRED: 'منقضی‌شده',
  })[status] ?? status;
