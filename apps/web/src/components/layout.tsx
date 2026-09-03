import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Menu, ShieldCheck, Stethoscope } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { useEffect, useState } from 'react';
import { authStorage } from '../lib/auth';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export const PublicLayout = () => (
  <div className="public-shell">
    <OfflineBanner />
    <header className="site-header">
      <Link to="/" className="brand-mark">
        <span className="brand-icon">
          <Stethoscope size={20} />
        </span>
        <span>نسخه‌یار</span>
      </Link>
      <nav>
        <Link to="/request">ثبت درخواست</Link>
        <Link to="/pharmacy/login">ورود داروخانه</Link>
      </nav>
    </header>
    <Outlet />
    <footer className="site-footer">
      اطلاعات نسخه فقط برای بررسی تأمین در سامانه استفاده می‌شود.
    </footer>
  </div>
);

export const PortalLayout = ({ kind }: { kind: 'pharmacy' | 'admin' }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.request<{ role: string }>('/auth/me'),
    enabled: kind === 'pharmacy',
    staleTime: 60_000,
  });
  const pharmacyLinks: Array<[string, string]> = [
    ['/pharmacy/dashboard', 'داشبورد'],
    ['/pharmacy/requests', 'درخواست‌ها'],
    ['/pharmacy/history', 'تاریخچه'],
    ['/pharmacy/registration-status', 'وضعیت ثبت‌نام'],
    ['/pharmacy/profile', 'پروفایل'],
  ];
  const adminLinks: Array<[string, string]> = [
    ['/admin/dashboard', 'داشبورد'],
    ['/admin/prescriptions', 'درخواست‌های نسخه'],
    ['/admin/pharmacy-registrations', 'ثبت‌نام داروخانه‌ها'],
    ['/admin/pharmacies', 'داروخانه‌ها'],
    ['/admin/users', 'کاربران'],
    ['/admin/insurance', 'بیمه‌ها'],
    ['/admin/logs', 'گزارش رویدادها'],
  ];
  const links =
    kind === 'pharmacy'
      ? pharmacyLinks.filter(
          ([path]) =>
            (path !== '/pharmacy/profile' && path !== '/pharmacy/registration-status') ||
            currentUser.data?.role === 'PHARMACY_ADMIN',
        )
      : adminLinks;
  const logout = async () => {
    const refreshToken = await authStorage.getRefreshToken();
    let csrfToken = authStorage.getCsrfToken();
    if (!refreshToken && !csrfToken && !Capacitor.isNativePlatform()) {
      const csrf = await api.request<{ csrfToken: string }>('/auth/csrf').catch(() => undefined);
      csrfToken = csrf?.csrfToken ?? null;
      authStorage.setCsrfToken(csrfToken);
    }
    await api
      .request('/auth/logout', {
        method: 'POST',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      })
      .catch(() => undefined);
    authStorage.setAccessToken(null);
    await authStorage.setRefreshToken(null);
    authStorage.setCsrfToken(null);
    navigate(kind === 'pharmacy' ? '/pharmacy/login' : '/admin/login');
  };
  return (
    <div className="portal-shell">
      <OfflineBanner />
      <aside className={`portal-sidebar ${open ? 'open' : ''}`}>
        <div className="portal-brand">
          <span className="brand-icon">
            {kind === 'admin' ? <ShieldCheck size={20} /> : <Stethoscope size={20} />}
          </span>
          {kind === 'admin' ? 'مدیریت سامانه' : 'پنل داروخانه'}
        </div>
        <nav className="portal-nav">
          {links.map(([path, label]) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setOpen(false)}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="logout-link" onClick={logout}>
          <LogOut size={17} />
          خروج
        </button>
      </aside>
      <div className="portal-main">
        <header className="portal-topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setOpen((value) => !value)}
            aria-label="باز کردن منو"
          >
            <Menu size={20} />
          </button>
          <span>
            {links.find(([path]) => location.pathname.startsWith(path))?.[1] ?? 'داشبورد'}
          </span>
          <span className="topbar-dot" />
        </header>
        <main className="portal-content">
          <Outlet />
        </main>
      </div>
      {open ? (
        <button className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="بستن منو" />
      ) : null}
    </div>
  );
};

const OfflineBanner = () => {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const onBrowserStatus = () => setOnline(navigator.onLine);
    window.addEventListener('online', onBrowserStatus);
    window.addEventListener('offline', onBrowserStatus);
    let disposed = false;
    let removeNativeListener: (() => Promise<void>) | null = null;
    if (Capacitor.isNativePlatform()) {
      void Network.getStatus().then((status) => {
        if (!disposed) setOnline(status.connected);
      });
      void Network.addListener('networkStatusChange', (status) => setOnline(status.connected)).then(
        (listener) => {
          if (disposed) void listener.remove();
          else removeNativeListener = () => listener.remove();
        },
      );
    }
    return () => {
      disposed = true;
      window.removeEventListener('online', onBrowserStatus);
      window.removeEventListener('offline', onBrowserStatus);
      if (removeNativeListener) void removeNativeListener();
    };
  }, []);

  return online ? null : (
    <div className="offline-banner" role="status">
      اتصال اینترنت برقرار نیست؛ پس از اتصال دوباره تلاش کنید.
    </div>
  );
};
