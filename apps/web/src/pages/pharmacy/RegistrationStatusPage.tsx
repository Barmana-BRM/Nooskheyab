import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { statusLabel } from '../../lib/status';
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  PageTitle,
  StatusBadge,
} from '../../components/ui';

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

export const RegistrationStatusPage = () => {
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
    onSuccess: () => void query.refetch(),
  });
  if (query.isPending || user.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  const canManageRegistration = user.data?.role === 'PHARMACY_ADMIN';
  return (
    <>
      <PageTitle title="وضعیت ثبت‌نام داروخانه" description={data.name} />
      <Card>
        <div className="button-row" style={{ justifyContent: 'space-between' }}>
          <StatusBadge
            status={data.registrationStatus}
            label={statusLabel(data.registrationStatus)}
          />
          {canManageRegistration &&
          ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(data.registrationStatus) ? (
            <Link to="/pharmacy/profile">
              <Button>تکمیل اطلاعات</Button>
            </Link>
          ) : null}
        </div>
        {data.reviewMessage ? (
          <div className="notice" style={{ marginTop: '1rem' }}>
            پیام بررسی: {data.reviewMessage}
          </div>
        ) : null}
        <h2 style={{ fontSize: '1rem', marginTop: '1.5rem' }}>مدارک</h2>
        {data.documents.length ? (
          <div className="mobile-row-list">
            {data.documents.map((document) => (
              <div className="mobile-row" key={document.id}>
                <strong>{document.originalName}</strong>
                <StatusBadge
                  status={document.verificationStatus}
                  label={statusLabel(document.verificationStatus)}
                />
              </div>
            ))}
          </div>
        ) : (
          <Empty>هنوز مدرکی بارگذاری نشده است.</Empty>
        )}
        {canManageRegistration &&
        ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(data.registrationStatus) ? (
          <div className="form-actions">
            <span className="muted">پس از تکمیل اطلاعات و بارگذاری مجوز ارسال کنید.</span>
            <Button onClick={() => submit.mutate()} loading={submit.isPending}>
              ارسال برای بررسی
            </Button>
          </div>
        ) : null}
      </Card>
    </>
  );
};
