import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { statusLabel } from '../../lib/status';
import {
  Button,
  Card,
  ErrorState,
  Input,
  Loading,
  PageTitle,
  StatusBadge,
} from '../../components/ui';
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
export const RegistrationDetailPage = () => {
  const { id = '' } = useParams();
  const [message, setMessage] = useState('');
  const query = useQuery({
    queryKey: ['admin', 'registration', id],
    queryFn: () => api.request<Registration>(`/admin/pharmacy-registrations/${id}`),
  });
  const review = useMutation({
    mutationFn: (action: 'approve' | 'reject' | 'request-changes') =>
      api.request(`/admin/pharmacy-registrations/${id}/${action}`, {
        method: 'POST',
        body: message ? JSON.stringify({ message }) : JSON.stringify({}),
      }),
    onSuccess: () => void query.refetch(),
  });
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const d = query.data;
  return (
    <>
      <PageTitle
        title={`بررسی ${d.name}`}
        description="تصمیم‌های بررسی در تاریخچه و Audit Log ثبت می‌شوند."
      />
      <Card>
        <div className="detail-grid">
          <div className="detail-item">
            <dt>مسئول فنی</dt>
            <dd>{d.technicalManager}</dd>
          </div>
          <div className="detail-item">
            <dt>مجوز</dt>
            <dd>{d.licenseNumber}</dd>
          </div>
          <div className="detail-item">
            <dt>تماس</dt>
            <dd>
              {d.mobile} · {d.phone}
            </dd>
          </div>
          <div className="detail-item">
            <dt>نشانی</dt>
            <dd>
              {d.province}، {d.city}، {d.address}
            </dd>
          </div>
        </div>
        <p>
          <StatusBadge status={d.registrationStatus} label={statusLabel(d.registrationStatus)} />
        </p>
        <h2 style={{ fontSize: '1rem' }}>مدارک</h2>
        {d.documents.map((doc) => (
          <div className="mobile-row" key={doc.id}>
            <span>{doc.originalName}</span>
            <StatusBadge
              status={doc.verificationStatus}
              label={statusLabel(doc.verificationStatus)}
            />
          </div>
        ))}
        {d.registrationStatus === 'PENDING_APPROVAL' ? (
          <div className="sticky-actions">
            <Input
              label="دلیل رد یا اصلاح (برای این دو تصمیم الزامی)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button onClick={() => review.mutate('approve')} loading={review.isPending}>
              تأیید
            </Button>
            <Button
              className="btn-secondary"
              onClick={() => review.mutate('request-changes')}
              loading={review.isPending}
            >
              درخواست اصلاح
            </Button>
            <Button
              className="btn-danger"
              onClick={() => review.mutate('reject')}
              loading={review.isPending}
            >
              رد
            </Button>
          </div>
        ) : null}
      </Card>
    </>
  );
};
