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
  Select,
  StatusBadge,
} from '../../components/ui';
interface Row {
  id: string;
  publicId: string;
  status: string;
  mobile: string;
  nationalId: string;
  baseInsurance: string;
  createdAt: string;
  responseCount: number;
}
interface List {
  items: Row[];
  pagination: { total: number; pages: number };
}
interface PharmacyOption {
  id: string;
  name: string;
}
interface InsuranceOption {
  id: string;
  name: string;
  type: string;
}
export const AdminPrescriptionsPage = () => {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const pharmacyId = params.get('pharmacyId') ?? '';
  const insuranceId = params.get('insuranceId') ?? '';
  const dateFrom = params.get('dateFrom') ?? '';
  const dateTo = params.get('dateTo') ?? '';
  const filterKey = params.toString();
  const pharmacies = useQuery({
    queryKey: ['admin', 'pharmacies', 'options'],
    queryFn: () => api.request<PharmacyOption[]>('/admin/pharmacies'),
    staleTime: 60_000,
  });
  const insurance = useQuery({
    queryKey: ['admin', 'insurance', 'options'],
    queryFn: () => api.request<InsuranceOption[]>('/admin/insurance'),
    staleTime: 60_000,
  });
  const query = useQuery({
    queryKey: ['admin', 'prescriptions', filterKey],
    queryFn: () => {
      const queryParams = new URLSearchParams({ limit: '50' });
      for (const [key, value] of Object.entries({
        search,
        status,
        pharmacyId,
        insuranceId,
        dateFrom,
        dateTo,
      })) {
        if (value) queryParams.set(key, value);
      }
      return api.request<List>(`/admin/prescriptions?${queryParams.toString()}`);
    },
  });
  return (
    <>
      <PageTitle
        title="درخواست‌های نسخه"
        description="درخواست‌ها را جست‌وجو کنید و برای بررسی اطلاعات و پاسخ‌ها، جزئیات هر نسخه را باز کنید."
      />
      <Card>
        <form
          className="toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const next = new URLSearchParams();
            for (const key of [
              'search',
              'status',
              'pharmacyId',
              'insuranceId',
              'dateFrom',
              'dateTo',
            ]) {
              const value = formData.get(key)?.toString().trim() ?? '';
              if (value) next.set(key, value);
            }
            setParams(next);
          }}
        >
          <Input
            label="جست‌وجو"
            name="search"
            defaultValue={search}
            placeholder="کد، موبایل یا کد ملی"
          />
          <Select label="وضعیت" name="status" defaultValue={status}>
            <option value="">همه وضعیت‌ها</option>
            <option value="PENDING">در انتظار بررسی</option>
            <option value="UNDER_REVIEW">در حال بررسی</option>
            <option value="ACCEPTED">پذیرش کامل</option>
            <option value="PARTIAL">پذیرش ناقص</option>
            <option value="REJECTED">عدم تأمین</option>
            <option value="SELECTED_PHARMACY">داروخانه انتخاب شد</option>
            <option value="EXPIRED">منقضی</option>
            <option value="COMPLETED">تکمیل‌شده</option>
            <option value="CANCELLED">لغوشده</option>
          </Select>
          <Select label="داروخانه" name="pharmacyId" defaultValue={pharmacyId}>
            <option value="">همه داروخانه‌ها</option>
            {pharmacies.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select label="بیمه پایه" name="insuranceId" defaultValue={insuranceId}>
            <option value="">همه بیمه‌ها</option>
            {insurance.data
              ?.filter((item) => item.type === 'BASE')
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </Select>
          <Input label="از تاریخ" name="dateFrom" type="date" defaultValue={dateFrom} />
          <Input label="تا تاریخ" name="dateTo" type="date" defaultValue={dateTo} />
          <Button type="submit">جست‌وجو</Button>
        </form>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : query.data.items.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>کد</th>
                  <th>موبایل</th>
                  <th>کد ملی</th>
                  <th>بیمه</th>
                  <th>وضعیت</th>
                  <th>ثبت</th>
                  <th>پاسخ</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((row) => (
                  <tr key={row.publicId}>
                    <td>
                      <Link className="link-button" to={`/admin/prescriptions/${row.id}`}>
                        {row.publicId}
                      </Link>
                    </td>
                    <td>{row.mobile}</td>
                    <td>{row.nationalId}</td>
                    <td>{row.baseInsurance}</td>
                    <td>
                      <StatusBadge status={row.status} label={statusLabel(row.status)} />
                    </td>
                    <td>{formatJalaliDateTime(row.createdAt)}</td>
                    <td>{row.responseCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mobile-row-list mobile-only-list">
              {query.data.items.map((row) => (
                <div className="mobile-row" key={row.publicId}>
                  <div className="button-row" style={{ justifyContent: 'space-between' }}>
                    <strong>{row.publicId}</strong>
                    <StatusBadge status={row.status} label={statusLabel(row.status)} />
                  </div>
                  <span className="muted">
                    {row.mobile} · {row.baseInsurance}
                  </span>
                  <Link className="link-button" to={`/admin/prescriptions/${row.id}`}>
                    جزئیات
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Empty />
        )}
      </Card>
    </>
  );
};
