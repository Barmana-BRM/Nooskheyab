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
    originalName: string;
    documentType: string;
    verificationStatus: string;
  }>;
}
export const RegistrationsPage = () => {
  const query = useQuery({
    queryKey: ['admin', 'registrations'],
    queryFn: () => api.request<Registration[]>('/admin/pharmacy-registrations'),
  });
  const approve = useMutation({
    mutationFn: (id: string) =>
      api.request(`/admin/pharmacy-registrations/${id}/approve`, { method: 'POST' }),
    onSuccess: () => void query.refetch(),
  });
  return (
    <>
      <PageTitle
        title="ثبت‌نام داروخانه‌ها"
        description="درخواست‌های ثبت‌نام را بررسی و تصمیم خود را ثبت کنید."
      />
      <Card>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : query.data.length ? (
          <div className="mobile-row-list">
            {query.data.map((row) => (
              <div className="mobile-row" key={row.id}>
                <div className="button-row" style={{ justifyContent: 'space-between' }}>
                  <strong>{row.name}</strong>
                  <StatusBadge
                    status={row.registrationStatus}
                    label={statusLabel(row.registrationStatus)}
                  />
                </div>
                <span className="muted">مدارک: {row.documents.length}</span>
                <div className="button-row">
                  <Link className="link-button" to={`/admin/pharmacy-registrations/${row.id}`}>
                    بررسی جزئیات
                  </Link>
                  {row.registrationStatus === 'PENDING_APPROVAL' ? (
                    <Button onClick={() => approve.mutate(row.id)} loading={approve.isPending}>
                      تأیید
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty>ثبت‌نامی برای نمایش وجود ندارد.</Empty>
        )}
      </Card>
    </>
  );
};
