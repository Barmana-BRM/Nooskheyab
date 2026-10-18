import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock3,
  FileCheck2,
  Layers,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Button, Card, Empty, ErrorState, Loading, PageTitle, StatCard } from '../../components/ui';
import { formatJalaliDate } from '../../lib/date';

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
    refetchInterval: () =>
      document.visibilityState === 'visible' && navigator.onLine ? 60_000 : false,
    refetchIntervalInBackground: false,
  });
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  const trend = data.dailyTrend.slice(-7);
  const maxCount = Math.max(1, ...trend.map((day) => day.count));
  return (
    <>
      <div className="page-heading-row">
        <PageTitle
          eyebrow="یک نگاه به وضعیت سامانه"
          title="داشبورد مدیریت"
          description="درخواست‌ها، پاسخ‌ها و عضویت داروخانه‌ها را از اینجا دنبال کنید."
        />
        <Button
          className="btn-secondary"
          loading={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw size={16} aria-hidden="true" />
          به‌روزرسانی
        </Button>
      </div>
      <div className="stats-grid">
        <StatCard
          title="درخواست امروز"
          value={data.requestsToday.toLocaleString('fa-IR')}
          icon={<ClipboardList size={19} />}
          caption="از آغاز روز جاری"
        />
        <StatCard
          title="درخواست هفته"
          value={data.requestsWeek.toLocaleString('fa-IR')}
          icon={<Layers size={19} />}
          tone="blue"
          caption="هفت روز اخیر"
        />
        <StatCard
          title="درخواست ماه"
          value={data.requestsMonth.toLocaleString('fa-IR')}
          icon={<FileCheck2 size={19} />}
          tone="amber"
          caption="سی روز اخیر"
        />
        <StatCard
          title="داروخانه فعال"
          value={data.activePharmacies.toLocaleString('fa-IR')}
          icon={<Building2 size={19} />}
          caption="آماده بررسی نسخه‌ها"
        />
        <StatCard
          title="موجودی کامل"
          value={data.accepted.toLocaleString('fa-IR')}
          icon={<CheckCircle2 size={19} />}
        />
        <StatCard
          title="موجودی بخشی از نسخه"
          value={data.partial.toLocaleString('fa-IR')}
          icon={<Layers size={19} />}
          tone="amber"
        />
        <StatCard
          title="عدم امکان تأمین"
          value={data.rejected.toLocaleString('fa-IR')}
          icon={<XCircle size={19} />}
          tone="rose"
        />
        <StatCard
          title="ثبت‌نام منتظر بررسی"
          value={data.pendingRegistrations.toLocaleString('fa-IR')}
          icon={<UsersRound size={19} />}
          tone="blue"
        />
      </div>
      <div className="dashboard-grid">
        <Card>
          <div className="card-heading">
            <div>
              <h2>روند ثبت درخواست‌ها</h2>
              <p>آخرین روزهای دارای درخواست، در بازه سی روزه</p>
            </div>
            <Link className="text-link" to="/admin/prescriptions">
              مشاهده درخواست‌ها
              <ArrowLeft size={16} aria-hidden="true" />
            </Link>
          </div>
          {trend.length ? (
            <figure style={{ margin: 0 }} aria-label="تعداد درخواست‌ها بر اساس روز">
              <div className="trend-chart">
                {trend.map((day) => (
                  <div className="trend-column" key={day.date}>
                    <span>{day.count.toLocaleString('fa-IR')}</span>
                    <div
                      className="trend-bar"
                      style={{ height: (day.count / maxCount) * 110 + 'px' }}
                    />
                    <small>{formatJalaliDate(day.date)}</small>
                  </div>
                ))}
              </div>
              <figcaption className="trend-caption">تعداد درخواست ثبت‌شده در هر روز</figcaption>
            </figure>
          ) : (
            <Empty>
              هنوز در این بازه درخواستی ثبت نشده است. با ثبت اولین نسخه، روند اینجا نمایش داده
              می‌شود.
            </Empty>
          )}
        </Card>
        <Card>
          <div className="card-heading">
            <h2>دسترسی‌های کاربردی</h2>
          </div>
          <div className="dashboard-shortcuts">
            <Link to="/admin/pharmacy-registrations">
              <FileCheck2 size={21} aria-hidden="true" />
              <span>
                بررسی ثبت‌نام داروخانه‌ها
                <small>
                  {data.pendingRegistrations
                    ? data.pendingRegistrations.toLocaleString('fa-IR') +
                      ' ثبت‌نام در انتظار رسیدگی'
                    : 'همه ثبت‌نام‌ها را از اینجا ببینید'}
                </small>
              </span>
              <ChevronLeft size={16} aria-hidden="true" />
            </Link>
            <Link to="/admin/pharmacies">
              <Building2 size={21} aria-hidden="true" />
              <span>
                مدیریت داروخانه‌ها<small>اطلاعات، وضعیت و مجوزها</small>
              </span>
              <ChevronLeft size={16} aria-hidden="true" />
            </Link>
            <Link to="/admin/users">
              <ShieldCheck size={21} aria-hidden="true" />
              <span>
                کاربران و دسترسی‌ها<small>مدیریت حساب‌ها و نقش‌ها</small>
              </span>
              <ChevronLeft size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="metric-line" style={{ marginTop: '1rem' }}>
            <span>
              <Clock3 size={15} aria-hidden="true" /> میانگین زمان پاسخ
            </span>
            <strong>{data.averageResponseMinutes.toLocaleString('fa-IR')} دقیقه</strong>
          </div>
        </Card>
      </div>
    </>
  );
};
