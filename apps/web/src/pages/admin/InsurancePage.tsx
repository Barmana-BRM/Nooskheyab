import { ApiClientError } from '@pharmacy-mvp/api-client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '../../lib/api';
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
interface Insurance {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}
interface InsuranceInput {
  name: string;
  type: 'BASE' | 'SUPPLEMENTARY';
}
export const InsurancePage = () => {
  const query = useQuery({
    queryKey: ['admin', 'insurance'],
    queryFn: () => api.request<Insurance[]>('/admin/insurance'),
  });
  const form = useForm<InsuranceInput>({
    defaultValues: { name: '', type: 'BASE' },
  });
  const create = useMutation({
    mutationFn: (value: InsuranceInput) =>
      api.request('/admin/insurance', { method: 'POST', body: JSON.stringify(value) }),
    onSuccess: () => {
      form.reset();
      void query.refetch();
    },
  });
  const toggle = useMutation({
    mutationFn: (id: string) => api.request(`/admin/insurance/${id}/toggle`, { method: 'POST' }),
    onSuccess: () => void query.refetch(),
  });
  const update = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.request(`/admin/insurance/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => void query.refetch(),
  });
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  const mutationError = [create.error, toggle.error, update.error].find(Boolean);
  const errorMessage =
    mutationError instanceof ApiClientError
      ? mutationError.message
      : mutationError
        ? 'عملیات انجام نشد.'
        : null;
  return (
    <>
      <PageTitle title="بیمه‌ها" description="فهرست بیمه‌های قابل انتخاب در فرم بیمار." />
      <Card>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>افزودن بیمه</h2>
        <form className="toolbar" onSubmit={form.handleSubmit((value) => create.mutate(value))}>
          <Input
            label="نام بیمه"
            {...form.register('name', { required: 'نام بیمه الزامی است.', minLength: 2 })}
            error={form.formState.errors.name?.message}
          />
          <Select label="نوع" {...form.register('type')}>
            <option value="BASE">پایه</option>
            <option value="SUPPLEMENTARY">تکمیلی</option>
          </Select>
          <Button type="submit" loading={create.isPending}>
            افزودن
          </Button>
        </form>
        {errorMessage ? <p className="field-error">{errorMessage}</p> : null}
      </Card>
      <Card>
        {query.data.length ? (
          <div className="mobile-row-list">
            {query.data.map((row) => (
              <div className="mobile-row" key={row.id}>
                <div className="button-row" style={{ justifyContent: 'space-between' }}>
                  <strong>{row.name}</strong>
                  <StatusBadge
                    status={row.isActive ? 'APPROVED' : 'SUSPENDED'}
                    label={row.isActive ? 'فعال' : 'غیرفعال'}
                  />
                </div>
                <span className="muted">{row.type === 'BASE' ? 'پایه' : 'تکمیلی'}</span>
                <div className="button-row">
                  <Button
                    className="btn-secondary"
                    onClick={() => {
                      const name = window.prompt('نام جدید بیمه:', row.name)?.trim();
                      if (name && name !== row.name) update.mutate({ id: row.id, name });
                    }}
                    loading={update.isPending}
                  >
                    ویرایش نام
                  </Button>
                  <Button
                    className={row.isActive ? 'btn-danger' : 'btn-secondary'}
                    onClick={() => toggle.mutate(row.id)}
                    loading={toggle.isPending}
                  >
                    {row.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                  </Button>
                </div>
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
