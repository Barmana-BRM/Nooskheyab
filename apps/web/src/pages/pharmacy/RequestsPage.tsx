import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, SlidersHorizontal } from 'lucide-react';
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
  Pagination,
  Select,
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
  const pageNumber = Number(params.get('page') ?? '1');
  const page = Number.isSafeInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const query = useQuery({
    queryKey: ['pharmacy', history ? 'history' : 'requests', params.toString()],
    queryFn: () => {
      const filters = new URLSearchParams();
      for (const key of ['search', 'status', 'dateFrom', 'dateTo', 'sort']) {
        const value = params.get(key);
        if (value) filters.set(key, value);
      }
      filters.set('page', String(page));
      filters.set('limit', '20');
      return api.request<List>(
        '/pharmacy/' + (history ? 'history' : 'prescriptions') + '?' + filters.toString(),
      );
    },
  });
  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(nextPage));
    setParams(next);
  };
  return (
    <>
      <PageTitle
        eyebrow={history ? 'مسیر رسیدگی، همیشه در دسترس' : 'برای رسیدگی به نسخه‌های تازه'}
        title={history ? 'تاریخچه درخواست‌ها' : 'درخواست‌های نسخه'}
        description={
          history
            ? 'درخواست‌های قبلی و نتیجه بررسی آن‌ها را جست‌وجو کنید.'
            : 'نسخه‌ها را باز کنید و پس از بررسی، وضعیت موجودی را به بیمار اعلام کنید.'
        }
      />
      <Card>
        <form
          className="request-filters"
          onSubmit={(event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            const next = new URLSearchParams();
            for (const key of ['search', 'status', 'dateFrom', 'dateTo', 'sort']) {
              const value = values.get(key)?.toString().trim();
              if (value) next.set(key, value);
            }
            setParams(next);
          }}
        >
          <div className="request-search">
            <Input
              label="جست‌وجوی درخواست"
              name="search"
              defaultValue={search}
              placeholder="کد پیگیری درخواست یا کد رهگیری نسخه"
            />
            <Button type="submit">
              <Search size={17} aria-hidden="true" />
              جست‌وجو
            </Button>
          </div>
          <details className="filter-options">
            <summary>
              <SlidersHorizontal size={16} aria-hidden="true" />
              فیلتر و مرتب‌سازی
              <span>
                {params.get('status') || params.get('dateFrom') || params.get('dateTo')
                  ? 'فیلتر فعال'
                  : 'نمایش همه درخواست‌ها'}
              </span>
            </summary>
            <div className="form-grid">
              <Select
                label="وضعیت بررسی داروخانه"
                name="status"
                defaultValue={params.get('status') ?? ''}
              >
                <option value="">همه وضعیت‌ها</option>
                <option value="SENT">درخواست جدید</option>
                <option value="VIEWED">دیده‌شده</option>
                <option value="RESPONDED">پاسخ داده‌شده</option>
                <option value="SELECTED">انتخاب‌شده توسط بیمار</option>
                <option value="CLOSED">بسته‌شده</option>
                <option value="EXPIRED">منقضی‌شده</option>
              </Select>
              <Select label="مرتب‌سازی" name="sort" defaultValue={params.get('sort') ?? 'newest'}>
                <option value="newest">جدیدترین درخواست‌ها</option>
                <option value="oldest">قدیمی‌ترین درخواست‌ها</option>
              </Select>
              <Input
                label="از تاریخ"
                name="dateFrom"
                type="date"
                defaultValue={params.get('dateFrom') ?? ''}
              />
              <Input
                label="تا تاریخ"
                name="dateTo"
                type="date"
                defaultValue={params.get('dateTo') ?? ''}
              />
              <div className="button-row full">
                <Button type="submit">اعمال فیلتر</Button>
                <Button className="btn-secondary" onClick={() => setParams({})}>
                  پاک کردن فیلترها
                </Button>
              </div>
            </div>
          </details>
        </form>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : query.data.items.length ? (
          <>
            <div className="list-summary">
              <span>{query.data.pagination.total.toLocaleString('fa-IR')} درخواست</span>
              <span>
                صفحه {page.toLocaleString('fa-IR')} از{' '}
                {query.data.pagination.pages.toLocaleString('fa-IR')}
              </span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <caption className="sr-only">درخواست‌های نسخه داروخانه</caption>
                <thead>
                  <tr>
                    <th scope="col">کد پیگیری</th>
                    <th scope="col">تاریخ درخواست</th>
                    <th scope="col">بیمه پایه</th>
                    <th scope="col">وضعیت نسخه</th>
                    <th scope="col">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <bdi>{row.publicId}</bdi>
                      </td>
                      <td>{formatJalaliDateTime(row.sentAt)}</td>
                      <td>{row.baseInsurance}</td>
                      <td>
                        <StatusBadge
                          status={row.prescriptionStatus}
                          label={statusLabel(row.prescriptionStatus)}
                        />
                      </td>
                      <td>
                        <Link className="link-button" to={'/pharmacy/requests/' + row.id}>
                          بررسی درخواست
                          <ArrowLeft size={15} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-row-list mobile-only-list">
              {query.data.items.map((row) => (
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
                  <span className="muted">
                    {formatJalaliDateTime(row.sentAt)} · {row.baseInsurance}
                  </span>
                  <Link className="link-button" to={'/pharmacy/requests/' + row.id}>
                    مشاهده و بررسی درخواست
                    <ArrowLeft size={15} aria-hidden="true" />
                  </Link>
                </div>
              ))}
            </div>
            {query.data.pagination.pages > 1 ? (
              <Pagination page={page} pages={query.data.pagination.pages} onChange={changePage} />
            ) : null}
          </>
        ) : (
          <Empty>
            {search || params.get('status') || params.get('dateFrom')
              ? 'درخواستی با این مشخصات پیدا نشد. جست‌وجو یا فیلترها را تغییر دهید.'
              : 'هنوز درخواستی برای نمایش وجود ندارد.'}
          </Empty>
        )}
      </Card>
    </>
  );
};
