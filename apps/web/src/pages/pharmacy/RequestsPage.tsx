import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatJalaliDateTime } from '../../lib/date';
import { statusLabel } from '../../lib/status';
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Input,
  Loading,
  PageTitle,
  StatusBadge,
} from '../../components/ui';

interface Row {
  id: string;
  publicId: string;
  status: string;
  prescriptionStatus: string;
  mobile: string;
  nationalId: string;
  baseInsurance: string;
  sentAt: string;
  response: { availabilityStatus: string } | null;
}
interface List {
  items: Row[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export const RequestsPage = ({ history = false }: { history?: boolean }) => {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const query = useQuery({
    queryKey: ['pharmacy', history ? 'history' : 'requests', search],
    queryFn: () =>
      api.request<List>(
        `/pharmacy/${history ? 'history' : 'prescriptions'}?limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      ),
  });
  return (
    <>
      <PageTitle
        title={history ? 'تاریخچه درخواست‌ها' : 'درخواست‌های نسخه'}
        description="فهرست درخواست‌های مربوط به همین داروخانه را مشاهده و مدیریت کنید."
      />
      <Card>
        <form
          className="toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get('search')?.toString() ?? '';
            setParams(value ? { search: value } : {});
          }}
        >
          <Input label="جست‌وجو" name="search" defaultValue={search} placeholder="کد پیگیری" />
          <Button type="submit">جست‌وجو</Button>
        </form>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : query.data.items.length ? (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>کد پیگیری</th>
                    <th>تاریخ</th>
                    <th>بیمه پایه</th>
                    <th>وضعیت</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((row) => (
                    <tr key={row.id}>
                      <td>{row.publicId}</td>
                      <td>{formatJalaliDateTime(row.sentAt)}</td>
                      <td>{row.baseInsurance}</td>
                      <td>
                        <StatusBadge
                          status={row.prescriptionStatus}
                          label={statusLabel(row.prescriptionStatus)}
                        />
                      </td>
                      <td>
                        <Link className="link-button" to={`/pharmacy/requests/${row.id}`}>
                          جزئیات
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-row-list">
              {query.data.items.map((row) => (
                <div className="mobile-row" key={row.id}>
                  <div className="button-row" style={{ justifyContent: 'space-between' }}>
                    <strong>{row.publicId}</strong>
                    <StatusBadge
                      status={row.prescriptionStatus}
                      label={statusLabel(row.prescriptionStatus)}
                    />
                  </div>
                  <span className="muted">
                    {formatJalaliDateTime(row.sentAt)} · {row.baseInsurance}
                  </span>
                  <Link className="link-button" to={`/pharmacy/requests/${row.id}`}>
                    مشاهده جزئیات
                  </Link>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty />
        )}
      </Card>
    </>
  );
};
