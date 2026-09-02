import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatJalaliDateTime } from '../../lib/date';
import { Card, Empty, ErrorState, Loading, PageTitle } from '../../components/ui';
interface Log {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  requestId: string;
  createdAt: string;
  metadataJson: Record<string, unknown>;
}
export const LogsPage = () => {
  const query = useQuery({
    queryKey: ['admin', 'logs'],
    queryFn: () => api.request<{ items: Log[] }>('/admin/audit-logs?limit=50'),
  });
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  return (
    <>
      <PageTitle
        title="گزارش رویدادها"
        description="Audit Log فقط برای مشاهده است و اطلاعات حساس آن حذف شده است."
      />
      <Card>
        {query.data.items.length ? (
          <div className="mobile-row-list">
            {query.data.items.map((row) => (
              <div className="mobile-row" key={row.id}>
                <strong>{row.action}</strong>
                <span className="muted">
                  {row.entityType} · {formatJalaliDateTime(row.createdAt)}
                </span>
                <code>{row.requestId}</code>
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
