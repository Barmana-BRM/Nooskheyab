import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatJalaliDateTime } from '../../lib/date';
import { Button, Card, Empty, ErrorState, Input, Loading, PageTitle } from '../../components/ui';
interface Log {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actor: string | null;
  requestId: string;
  createdAt: string;
  metadataJson: Record<string, unknown>;
}
export const LogsPage = () => {
  const [params, setParams] = useSearchParams();
  const action = params.get('action') ?? '';
  const entityType = params.get('entityType') ?? '';
  const actor = params.get('actor') ?? '';
  const requestId = params.get('requestId') ?? '';
  const dateFrom = params.get('dateFrom') ?? '';
  const dateTo = params.get('dateTo') ?? '';
  const query = useQuery({
    queryKey: ['admin', 'logs', params.toString()],
    queryFn: () => {
      const queryParams = new URLSearchParams(params);
      queryParams.set('limit', '50');
      return api.request<{ items: Log[] }>(`/admin/audit-logs?${queryParams.toString()}`);
    },
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
        <form
          className="toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            const next = new URLSearchParams();
            for (const key of [
              'action',
              'entityType',
              'actor',
              'requestId',
              'dateFrom',
              'dateTo',
            ]) {
              const value = values.get(key)?.toString().trim() ?? '';
              if (value) next.set(key, value);
            }
            setParams(next);
          }}
        >
          <Input label="عملیات" name="action" defaultValue={action} placeholder="مثلاً LOGIN" />
          <Input label="موجودیت" name="entityType" defaultValue={entityType} />
          <Input label="کاربر ثبت‌کننده" name="actor" defaultValue={actor} />
          <Input label="شناسه درخواست" name="requestId" defaultValue={requestId} />
          <Input label="از تاریخ" name="dateFrom" type="date" defaultValue={dateFrom} />
          <Input label="تا تاریخ" name="dateTo" type="date" defaultValue={dateTo} />
          <Button type="submit">اعمال فیلتر</Button>
        </form>
        {query.data.items.length ? (
          <div className="mobile-row-list">
            {query.data.items.map((row) => (
              <div className="mobile-row" key={row.id}>
                <strong>{row.action}</strong>
                <span className="muted">
                  {row.entityType} · {row.actor ?? 'سیستمی'} · {formatJalaliDateTime(row.createdAt)}
                </span>
                <code>{row.requestId}</code>
                <pre dir="ltr" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(row.metadataJson, null, 2)}
                </pre>
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
