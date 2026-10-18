import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bell,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock3,
  FileCheck2,
  Layers,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  PageTitle,
  StatCard,
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
  const data = stats.data;
  return (
    <>
      <div className="page-heading-row">
        <PageTitle
          eyebrow="رسیدگی بهتر، از همین‌جا"
          title="داشبورد داروخانه"
          description="درخواست‌های تازه را ببینید و نتیجه بررسی نسخه‌ها را ثبت کنید."
        />
        <Link className="btn btn-primary" to="/pharmacy/requests">
          مشاهده درخواست‌ها
          <ArrowLeft size={17} aria-hidden="true" />
        </Link>
      </div>
      <div className="stats-grid stats-grid-six">
        <StatCard
          title="درخواست جدید"
          value={data.new.toLocaleString('fa-IR')}
          icon={<ClipboardList size={19} />}
        />
        <StatCard
          title="در حال بررسی"
          value={data.underReview.toLocaleString('fa-IR')}
          icon={<Clock3 size={19} />}
          tone="blue"
        />
        <StatCard
          title="پذیرش کامل"
          value={data.accepted.toLocaleString('fa-IR')}
          icon={<CheckCircle2 size={19} />}
        />
        <StatCard
          title="پذیرش ناقص"
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
          title="کل درخواست‌های امروز"
          value={data.today.toLocaleString('fa-IR')}
          icon={<FileCheck2 size={19} />}
          tone="blue"
        />
      </div>
      <div className="dashboard-grid">
        <Card>
          <div className="card-heading">
            <div>
              <h2>آخرین درخواست‌ها</h2>
              <p>پنج درخواست تازه ارسال‌شده به داروخانه شما</p>
            </div>
            <Button
              className="btn-secondary"
              loading={rows.isFetching}
              onClick={() => {
                void rows.refetch();
                void stats.refetch();
              }}
            >
              <RefreshCw size={15} aria-hidden="true" />
              به‌روزرسانی
            </Button>
          </div>
          {rows.isPending ? (
            <Loading />
          ) : rows.isError ? (
            <ErrorState onRetry={() => void rows.refetch()} />
          ) : rows.data.items.length ? (
            <div className="mobile-row-list">
              {rows.data.items.map((row) => (
                <div className="mobile-row" key={row.id}>
                  <div className="button-row">
                    <strong>
                      <bdi>{row.publicId}</bdi>
                    </strong>
                    <StatusBadge
                      status={row.prescriptionStatus}
                      label={statusLabel(row.prescriptionStatus)}
                    />
                  </div>
                  <span className="muted">{formatJalaliDateTime(row.sentAt)}</span>
                  <Link className="link-button" to={'/pharmacy/requests/' + row.id}>
                    بررسی درخواست
                    <ArrowLeft size={15} aria-hidden="true" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <Empty>
              هنوز نسخه‌ای برای داروخانه شما ارسال نشده است. درخواست‌های جدید اینجا نمایش داده
              می‌شوند.
            </Empty>
          )}
        </Card>
        <Card>
          <div className="card-heading">
            <h2>فضای کار داروخانه</h2>
          </div>
          <div className="dashboard-shortcuts">
            <Link to="/pharmacy/requests">
              <Bell size={21} aria-hidden="true" />
              <span>
                رسیدگی به درخواست‌ها
                <small>
                  {data.unreadNotifications.toLocaleString('fa-IR') + ' اعلان خوانده‌نشده'}
                </small>
              </span>
              <ChevronLeft size={16} aria-hidden="true" />
            </Link>
            <Link to="/pharmacy/history">
              <ClipboardList size={21} aria-hidden="true" />
              <span>
                تاریخچه بررسی‌ها<small>درخواست‌ها و پاسخ‌های قبلی</small>
              </span>
              <ChevronLeft size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="notice notice-icon" style={{ marginTop: '1.2rem' }}>
            <Building2 size={19} aria-hidden="true" />
            <p>پاسخ دقیق شما به بیمار کمک می‌کند پیش از مراجعه، تصمیم روشن‌تری بگیرد.</p>
          </div>
        </Card>
      </div>
    </>
  );
};
