import { useQuery } from '@tanstack/react-query';
import { Bell, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  PageTitle,
  StatusBadge,
} from '../../components/ui';
import { statusLabel } from '../../lib/status';
import { formatJalaliDateTime } from '../../lib/date';

interface Dashboard {
  new: number;
  underReview: number;
  accepted: number;
  partial: number;
  rejected: number;
  today: number;
  unreadNotifications: number;
}
interface RequestRow {
  id: string;
  publicId: string;
  status: string;
  prescriptionStatus: string;
  sentAt: string;
  response: { availabilityStatus: string } | null;
}

export const PharmacyDashboardPage = () => {
  const stats = useQuery({
    queryKey: ['pharmacy', 'dashboard'],
    queryFn: () => api.request<Dashboard>('/pharmacy/dashboard'),
    refetchInterval: () =>
      document.visibilityState === 'visible' && navigator.onLine ? 60_000 : false,
    refetchIntervalInBackground: false,
  });
  const rows = useQuery({
    queryKey: ['pharmacy', 'requests', 'recent'],
    queryFn: () =>
      api.request<{ items: RequestRow[]; pagination: { total: number } }>(
        '/pharmacy/prescriptions?limit=5',
      ),
  });
  if (stats.isPending) return <Loading />;
  if (stats.isError) return <ErrorState onRetry={() => void stats.refetch()} />;
  return (
    <>
      <PageTitle
        title="داشبورد داروخانه"
        description="وضعیت درخواست‌های ارسال‌شده برای این داروخانه را دنبال کنید."
      />
      <div className="stats-grid">
        <Stat title="درخواست جدید" value={stats.data.new} />
        <Stat title="در حال بررسی" value={stats.data.underReview} />
        <Stat title="پذیرش کامل" value={stats.data.accepted} />
        <Stat title="پذیرش ناقص" value={stats.data.partial} />
      </div>
      <Card>
        <div className="button-row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>آخرین درخواست‌ها</h2>
          <div className="button-row">
            <span className="muted">
              <Bell size={15} style={{ verticalAlign: 'middle' }} /> اعلان‌های خوانده‌نشده:{' '}
              <strong>{stats.data.unreadNotifications}</strong> · امروز: {stats.data.today}
            </span>
            <Button className="btn-secondary" onClick={() => void rows.refetch()}>
              <RefreshCw size={15} />
              به‌روزرسانی
            </Button>
          </div>
        </div>
        {rows.isPending ? (
          <Loading />
        ) : rows.isError ? (
          <ErrorState onRetry={() => void rows.refetch()} />
        ) : rows.data.items.length ? (
          <div className="mobile-row-list" style={{ marginTop: '1rem' }}>
            {rows.data.items.map((row) => (
              <div className="mobile-row" key={row.id}>
                <div className="button-row" style={{ justifyContent: 'space-between' }}>
                  <strong>{row.publicId}</strong>
                  <StatusBadge
                    status={row.prescriptionStatus}
                    label={statusLabel(row.prescriptionStatus)}
                  />
                </div>
                <span className="muted">{formatJalaliDateTime(row.sentAt)}</span>
                <Link to={`/pharmacy/requests/${row.id}`} className="link-button">
                  مشاهده جزئیات
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </Card>
    </>
  );
};
const Stat = ({ title, value }: { title: string; value: number }) => (
  <div className="stat-card">
    <span>{title}</span>
    <strong>{value.toLocaleString('fa-IR')}</strong>
  </div>
);
