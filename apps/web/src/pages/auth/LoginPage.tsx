import { zodResolver } from '@hookform/resolvers/zod';
import { Capacitor } from '@capacitor/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema } from '@pharmacy-mvp/validation';
import { api } from '../../lib/api';
import { authStorage } from '../../lib/auth';
import { Button, Card, Input, PageTitle, PasswordInput } from '../../components/ui';
import { ApiClientError } from '@pharmacy-mvp/api-client';
import type { z } from 'zod';

type LoginInput = z.infer<typeof loginSchema>;
export const LoginPage = ({ kind }: { kind: 'pharmacy' | 'admin' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const registration = location.state as { registered?: boolean; username?: string } | null;
  const queryClient = useQueryClient();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: registration?.username ?? '', password: '' },
  });
  const mutation = useMutation({
    mutationFn: (value: LoginInput) =>
      api.request<{ accessToken: string; refreshToken?: string; csrfToken?: string }>(
        '/auth/login',
        {
          method: 'POST',
          headers: { 'X-Client-Platform': Capacitor.isNativePlatform() ? 'native' : 'browser' },
          body: JSON.stringify(value),
        },
      ),
    onSuccess: async (data) => {
      authStorage.setAccessToken(data.accessToken);
      authStorage.setCsrfToken(data.csrfToken ?? null);
      if (data.refreshToken) await authStorage.setRefreshToken(data.refreshToken);
      const me = await api.request<{ role: string; pharmacyRegistrationStatus: string | null }>(
        '/auth/me',
      );
      queryClient.clear();
      queryClient.setQueryData(['auth', 'me'], me);
      const target =
        kind === 'pharmacy' && me.pharmacyRegistrationStatus !== 'APPROVED'
          ? '/pharmacy/registration-status'
          : kind === 'pharmacy'
            ? '/pharmacy/dashboard'
            : '/admin/dashboard';
      navigate(target, { replace: true });
    },
  });
  return (
    <main className="auth-page" id="main-content">
      <div className="auth-form-content">
        <PageTitle
          eyebrow={kind === 'pharmacy' ? 'خوش برگشتید، همکار گرامی' : 'فضای مدیریت نسخه‌یاب'}
          title={kind === 'pharmacy' ? 'ورود داروخانه' : 'ورود مدیریت سامانه'}
          description={
            kind === 'pharmacy'
              ? 'برای بررسی و پاسخ به نسخه‌ها، وارد حساب داروخانه شوید.'
              : 'برای رسیدگی به درخواست‌ها و مدیریت سامانه وارد شوید.'
          }
        />
        <Card className="auth-card">
          {registration?.registered ? (
            <div className="alert alert-success" role="status">
              حساب داروخانه ساخته شد. وارد شوید و مدارک را برای بررسی ارسال کنید.
            </div>
          ) : null}
          <form
            onSubmit={form.handleSubmit((value) => {
              if (!mutation.isPending) mutation.mutate(value);
            })}
            noValidate
          >
            <Input
              label="نام کاربری"
              autoComplete="username"
              dir="ltr"
              placeholder="نام کاربری خود را وارد کنید"
              required
              {...form.register('username')}
              error={form.formState.errors.username?.message}
            />
            <PasswordInput
              label="رمز عبور"
              autoComplete="current-password"
              placeholder="رمز عبور حساب شما"
              required
              {...form.register('password')}
              error={form.formState.errors.password?.message}
            />
            {mutation.isError ? (
              <div className="error-summary" role="alert">
                {mutation.error instanceof ApiClientError && mutation.error.status === 429
                  ? 'تعداد تلاش‌های ورود زیاد است. کمی بعد دوباره تلاش کنید.'
                  : 'ورود انجام نشد. نام کاربری و رمز عبور را بررسی کنید.'}
              </div>
            ) : null}
            <div className="form-actions">
              <Button type="submit" loading={mutation.isPending}>
                ورود به {kind === 'pharmacy' ? 'پنل داروخانه' : 'پنل مدیریت'}
                <ArrowLeft size={18} aria-hidden="true" />
              </Button>
              <p>
                {kind === 'pharmacy' ? (
                  <>
                    هنوز حساب ندارید؟<Link to="/pharmacy/register">ثبت‌نام داروخانه</Link>
                  </>
                ) : (
                  <Link to="/">بازگشت به صفحه اصلی</Link>
                )}
              </p>
            </div>
          </form>
        </Card>
        <p className="auth-security">
          <LockKeyhole size={15} aria-hidden="true" />
          اطلاعات ورودتان را در اختیار دیگران نگذارید.
        </p>
      </div>
      <aside className="auth-art">
        <img
          src={
            '/images/landing/' + (kind === 'pharmacy' ? 'step-review' : 'step-results') + '.webp'
          }
          alt={kind === 'pharmacy' ? 'بررسی نسخه توسط داروساز' : 'بررسی وضعیت درخواست‌ها'}
          width="640"
          height="640"
        />
        <h2>
          {kind === 'pharmacy' ? (
            <>
              یک پنل روشن،
              <br />
              برای رسیدگی بهتر به نسخه‌ها.
            </>
          ) : (
            <>
              یک نگاه دقیق‌تر،
              <br />
              به مسیر رسیدگی به نسخه‌ها.
            </>
          )}
        </h2>
        <p>
          {kind === 'pharmacy'
            ? 'درخواست‌ها را یک‌جا ببینید، موجودی را بررسی کنید و بیماران را پیش از مراجعه راهنمایی کنید.'
            : 'ثبت‌نام داروخانه‌ها، درخواست‌های بیماران و گزارش‌ها را از یک فضای منظم دنبال کنید.'}
        </p>
        <span className="auth-art-badge">
          {kind === 'pharmacy' ? (
            <CheckCircle2 size={17} aria-hidden="true" />
          ) : (
            <ShieldCheck size={17} aria-hidden="true" />
          )}
          دسترسی متناسب با نقش شما
        </span>
      </aside>
    </main>
  );
};
