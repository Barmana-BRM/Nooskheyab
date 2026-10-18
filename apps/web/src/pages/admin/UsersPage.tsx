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
  PasswordInput,
  Select,
  StatusBadge,
} from '../../components/ui';
interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  mobile: string;
  role: string;
  isActive: boolean;
  pharmacy: { name: string } | null;
}
interface PharmacyOption {
  id: string;
  name: string;
}
interface CreateUserInput {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  mobile: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'PHARMACY_ADMIN' | 'PHARMACY_USER';
  pharmacyId: string;
}

const roleLabel = (role: string): string =>
  ({
    ADMIN: 'مدیر سامانه',
    SUPER_ADMIN: 'مدیر ارشد',
    PHARMACY_ADMIN: 'مدیر داروخانه',
    PHARMACY_USER: 'کاربر داروخانه',
  })[role] ?? role;

export const UsersPage = () => {
  const query = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.request<User[]>('/admin/users'),
  });
  const pharmacies = useQuery({
    queryKey: ['admin', 'pharmacies', 'options'],
    queryFn: () => api.request<PharmacyOption[]>('/admin/pharmacies'),
  });
  const form = useForm<CreateUserInput>({
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      password: '',
      mobile: '',
      role: 'PHARMACY_USER',
      pharmacyId: '',
    },
  });
  const role = form.watch('role');
  const create = useMutation({
    mutationFn: (value: CreateUserInput) =>
      api.request('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          ...value,
          pharmacyId: value.role.startsWith('PHARMACY') ? value.pharmacyId || undefined : undefined,
        }),
      }),
    onSuccess: () => {
      form.reset();
      void query.refetch();
    },
  });
  const update = useMutation({
    mutationFn: ({ id, role: nextRole }: { id: string; role: User['role'] }) =>
      api.request(`/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ role: nextRole }),
      }),
    onSuccess: () => void query.refetch(),
  });
  const state = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.request(`/admin/users/${id}/${active ? 'enable' : 'disable'}`, { method: 'POST' }),
    onSuccess: () => void query.refetch(),
  });
  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.request(`/admin/users/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
    onSuccess: () => void query.refetch(),
  });
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  const mutationError = [create.error, update.error, state.error, resetPassword.error].find(
    Boolean,
  );
  const errorMessage =
    mutationError instanceof ApiClientError
      ? mutationError.message
      : mutationError
        ? 'عملیات انجام نشد.'
        : null;
  return (
    <>
      <PageTitle
        title="کاربران و نقش‌ها"
        description="حساب‌های کاربری، نقش‌ها و دسترسی به پنل را مدیریت کنید."
      />
      <Card>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>ایجاد کاربر</h2>
        <form onSubmit={form.handleSubmit((value) => create.mutate(value))} className="form-grid">
          <Input
            label="نام"
            {...form.register('firstName', { required: 'نام الزامی است.' })}
            error={form.formState.errors.firstName?.message}
          />
          <Input
            label="نام خانوادگی"
            {...form.register('lastName', { required: 'نام خانوادگی الزامی است.' })}
            error={form.formState.errors.lastName?.message}
          />
          <Input
            label="نام کاربری"
            {...form.register('username', { required: 'نام کاربری الزامی است.' })}
            error={form.formState.errors.username?.message}
          />
          <PasswordInput
            label="رمز عبور"
            {...form.register('password', { required: 'رمز عبور الزامی است.', minLength: 10 })}
            error={form.formState.errors.password?.message}
          />
          <Input
            label="موبایل"
            inputMode="numeric"
            {...form.register('mobile', { required: 'موبایل الزامی است.' })}
            error={form.formState.errors.mobile?.message}
          />
          <Select label="نقش" {...form.register('role')}>
            <option value="PHARMACY_USER">کاربر داروخانه</option>
            <option value="PHARMACY_ADMIN">مدیر داروخانه</option>
            <option value="ADMIN">مدیر سامانه</option>
            <option value="SUPER_ADMIN">مدیر ارشد</option>
          </Select>
          {role.startsWith('PHARMACY') ? (
            <Select
              label="داروخانه"
              {...form.register('pharmacyId', { required: 'داروخانه را انتخاب کنید.' })}
              error={form.formState.errors.pharmacyId?.message}
            >
              <option value="">انتخاب کنید</option>
              {(pharmacies.data ?? []).map((pharmacy) => (
                <option key={pharmacy.id} value={pharmacy.id}>
                  {pharmacy.name}
                </option>
              ))}
            </Select>
          ) : null}
          <div className="form-actions full" style={{ marginTop: 0 }}>
            <span className="muted">رمز عبور را فقط در اختیار صاحب حساب قرار دهید.</span>
            <Button type="submit" loading={create.isPending}>
              ایجاد کاربر
            </Button>
          </div>
        </form>
        {errorMessage ? <p className="field-error">{errorMessage}</p> : null}
      </Card>
      <Card>
        {query.data.length ? (
          <div className="mobile-row-list">
            {query.data.map((user) => (
              <div className="mobile-row" key={user.id}>
                <div className="button-row" style={{ justifyContent: 'space-between' }}>
                  <strong>
                    {user.firstName} {user.lastName}
                  </strong>
                  <StatusBadge
                    status={user.isActive ? 'APPROVED' : 'SUSPENDED'}
                    label={user.isActive ? 'فعال' : 'غیرفعال'}
                  />
                </div>
                <span className="muted">
                  {user.username} · {roleLabel(user.role)}
                  {user.pharmacy ? ` · ${user.pharmacy.name}` : ''}
                </span>
                <div className="button-row">
                  <Select
                    label="نقش"
                    aria-label={`نقش ${user.username}`}
                    value={user.role}
                    onChange={(event) =>
                      update.mutate({ id: user.id, role: event.target.value as User['role'] })
                    }
                  >
                    {user.pharmacy ? (
                      <>
                        <option value="PHARMACY_USER">کاربر داروخانه</option>
                        <option value="PHARMACY_ADMIN">مدیر داروخانه</option>
                      </>
                    ) : (
                      <>
                        <option value="ADMIN">مدیر سامانه</option>
                        <option value="SUPER_ADMIN">مدیر ارشد</option>
                      </>
                    )}
                  </Select>
                  <Button
                    className={user.isActive ? 'btn-danger' : 'btn-secondary'}
                    onClick={() => {
                      if (
                        user.isActive &&
                        !window.confirm('آیا از غیرفعال کردن این کاربر مطمئن هستید؟')
                      )
                        return;
                      state.mutate({ id: user.id, active: !user.isActive });
                    }}
                    loading={state.isPending}
                  >
                    {user.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                  </Button>
                  <Button
                    className="btn-secondary"
                    onClick={() => {
                      const password = window.prompt('رمز عبور جدید را وارد کنید:');
                      if (password) resetPassword.mutate({ id: user.id, password });
                    }}
                    loading={resetPassword.isPending}
                  >
                    تغییر رمز
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
