import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, ErrorState, Loading, PageTitle } from '../../components/ui';

interface Dashboard {
  requestsToday: number;
  requestsWeek: number;
  requestsMonth: number;
  accepted: number;
  partial: number;
  rejected: number;
  activePharmacies: number;
  pendingRegistrations: number;
  averageResponseMinutes: number;
  dailyTrend: Array<{ date: string; count: number }>;
}
export const AdminDashboardPage = () => {
  const query = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.request<Dashboard>('/admin/dashboard'),
    refetchInterval: 60_000,
  });
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  const d = query.data;
  return (
    <>
      <PageTitle
        title="داشبورد مدیریت"
        description="آمار این صفحه از داده‌های واقعی سامانه محاسبه می‌شود."
      />
      <div className="stats-grid">
        <Stat t="درخواست امروز" v={d.requestsToday} />
        <Stat t="درخواست هفته" v={d.requestsWeek} />
        <Stat t="درخواست ماه" v={d.requestsMonth} />
        <Stat t="داروخانه فعال" v={d.activePharmacies} />
        <Stat t="پذیرش کامل" v={d.accepted} />
        <Stat t="پذیرش ناقص" v={d.partial} />
        <Stat t="عدم تأمین" v={d.rejected} />
        <Stat t="در انتظار بررسی" v={d.pendingRegistrations} />
      </div>
      <Card>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>شاخص عملیاتی</h2>
        <p className="muted">
          میانگین زمان پاسخ داروخانه‌ها در ۳۰ روز اخیر:{' '}
          <strong>{d.averageResponseMinutes} دقیقه</strong>
        </p>
        <div className="notice">
          روند روزانه در بازه ۳۰ روز اخیر:{' '}
          {d.dailyTrend.length
            ? d.dailyTrend.map((item) => `${item.date}: ${item.count}`).join('، ')
            : 'داده‌ای ثبت نشده است.'}
        </div>
      </Card>
    </>
  );
};
const Stat = ({ t, v }: { t: string; v: number }) => (
  <div className="stat-card">
    <span>{t}</span>
    <strong>{v.toLocaleString('fa-IR')}</strong>
  </div>
);
