import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Loading } from './ui';
import type { UserRole } from '@pharmacy-mvp/types';

export const AuthGuard = ({ roles }: { roles: UserRole[] }) => {
  const location = useLocation();
  const query = useQuery({ queryKey: ['auth', 'me'], queryFn: () => api.request<{ role: UserRole }>('/auth/me'), retry: false });
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data || !roles.includes(query.data.role)) return <Navigate to={query.data?.role?.startsWith('PHARMACY') ? '/pharmacy/login' : '/admin/login'} replace state={{ from: location.pathname }} />;
  return <Outlet />;
};
