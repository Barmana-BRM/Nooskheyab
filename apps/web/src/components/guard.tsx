import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Loading } from './ui';
import type { UserRole } from '@pharmacy-mvp/types';

export const AuthGuard = ({ roles }: { roles: UserRole[] }) => {
  const location = useLocation();
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () =>
      api.request<{ role: UserRole; pharmacyRegistrationStatus: string | null }>('/auth/me'),
    retry: false,
  });
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data || !roles.includes(query.data.role))
    return (
      <Navigate
        to={
          query.data?.role?.startsWith('PHARMACY') ||
          roles.some((role) => role.startsWith('PHARMACY'))
            ? '/pharmacy/login'
            : '/admin/login'
        }
        replace
        state={{ from: location.pathname }}
      />
    );
  const pendingPharmacy =
    query.data.role.startsWith('PHARMACY') && query.data.pharmacyRegistrationStatus !== 'APPROVED';
  if (
    pendingPharmacy &&
    !location.pathname.startsWith('/pharmacy/registration-status') &&
    !location.pathname.startsWith('/pharmacy/profile')
  )
    return <Navigate to="/pharmacy/registration-status" replace />;
  return <Outlet />;
};
