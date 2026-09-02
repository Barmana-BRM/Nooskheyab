import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { LockKeyhole, LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { loginSchema } from '@pharmacy-mvp/validation';
import { api } from '../../lib/api';
import { authStorage } from '../../lib/auth';
import { Button, Card, Input, PageTitle } from '../../components/ui';
import { z } from 'zod';

type LoginInput = z.infer<typeof loginSchema>;

export const LoginPage = ({ kind }: { kind: 'pharmacy' | 'admin' }) => {
  const navigate = useNavigate();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { username: '', password: '' } });
  const mutation = useMutation({ mutationFn: (value: LoginInput) => api.request<{ accessToken: string; refreshToken?: string }>('/auth/login', { method: 'POST', headers: { 'X-Client-Platform': 'browser' }, body: JSON.stringify(value) }), onSuccess: async (data) => { authStorage.setAccessToken(data.accessToken); if (data.refreshToken) await authStorage.setRefreshToken(data.refreshToken); navigate(kind === 'pharmacy' ? '/pharmacy/dashboard' : '/admin/dashboard', { replace: true }); } });
  return <main className="form-page" style={{ paddingTop: '7vh' } as never}><PageTitle title={kind === 'pharmacy' ? 'ورود داروخانه' : 'ورود مدیریت سامانه'} description="برای دسترسی امن، نام کاربری و رمز عبور خود را وارد کنید." /><Card><form onSubmit={form.handleSubmit((value) => mutation.mutate(value))}><Input label="نام کاربری" autoComplete="username" {...form.register('username')} error={form.formState.errors.username?.message} /><Input label="رمز عبور" type="password" autoComplete="current-password" {...form.register('password')} error={form.formState.errors.password?.message} /><div className="notice" style={{ marginTop: '1rem' }}><LockKeyhole size={16} style={{ verticalAlign: 'middle' }} /> خطاهای ورود جزئیات حساب را افشا نمی‌کنند.</div>{mutation.isError ? <p className="field-error" role="alert">نام کاربری یا رمز عبور نادرست است.</p> : null}<div className="form-actions"><Link to={kind === 'pharmacy' ? '/pharmacy/register' : '/'} className="muted">{kind === 'pharmacy' ? 'ثبت‌نام داروخانه' : 'بازگشت'}</Link><Button type="submit" loading={mutation.isPending}><LogIn size={17} />ورود</Button></div></form></Card></main>;
};
