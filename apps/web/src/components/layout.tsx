import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  Bell,
  Building2,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  FileCheck2,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  UsersRound,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { useEffect, useState } from 'react';
import { authStorage } from '../lib/auth';
import { api } from '../lib/api';
import { formatJalaliDate } from '../lib/date';
import { Dialog } from './ui';

export const Brand = ({ subtitle = 'اطمینان قبل از مراجعه' }: { subtitle?: string }) => (
  <Link to="/" className="brand-mark" aria-label="نسخه‌یاب، صفحه اصلی">
    <img className="brand-logo" src="/logo-mark.svg" alt="" width="44" height="44" />
    <span className="brand-copy">
      <strong>
        نسخه‌یاب<span className="brand-period">.</span>
      </strong>
      <small>{subtitle}</small>
    </span>
  </Link>
);

const publicLinks = [
  ['/', 'خانه'],
  ['/#how-it-works', 'چطور کار می‌کند؟'],
  ['/request/track', 'پیگیری درخواست'],
  ['/#questions', 'پرسش‌های متداول'],
] as const;

export const PublicLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMenuOpen(false), [location.pathname, location.hash]);

  return (
    <div className="public-shell">
      <a className="skip-link" href="#main-content">
        رفتن به محتوای اصلی
      </a>
      <OfflineBanner />
      <header className="site-header">
        <div className="site-header-inner">
          <Brand />
          <nav className="public-nav" aria-label="ناوبری اصلی">
            {publicLinks.map(([path, label]) => (
              <Link
                key={path}
                to={path}
                className={location.pathname === path ? 'active' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link to="/pharmacy/login" className="btn btn-secondary pharmacy-entry">
              <Building2 size={17} aria-hidden="true" />
              <span>ورود داروخانه</span>
              <ChevronLeft size={15} aria-hidden="true" />
            </Link>
            <button
              className="icon-button public-menu-toggle"
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="باز کردن منو"
              aria-expanded={menuOpen}
              aria-controls="public-mobile-menu"
            >
              <Menu size={21} />
            </button>
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer" id="privacy">
        <div className="footer-inner">
          <div className="footer-about">
            <Brand />
            <p>یک راه ساده برای بررسی موجود بودن نسخه، پیش از مراجعه به داروخانه.</p>
          </div>
          <nav className="footer-links" aria-label="دسترسی‌های پایین صفحه">
            <Link to="/request">ثبت درخواست نسخه</Link>
            <Link to="/request/track">پیگیری درخواست</Link>
            <Link to="/pharmacy/register">پیوستن داروخانه</Link>
            <Link to="/#questions">پرسش‌های متداول</Link>
          </nav>
          <div className="footer-privacy">
            <ShieldCheck size={21} aria-hidden="true" />
            <p>
              اطلاعات نسخه فقط برای بررسی امکان تأمین، در اختیار داروخانه‌های مجاز قرار می‌گیرد.
              لینک پیگیری را نزد خود نگه دارید.
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>نسخه‌یاب؛ یک قدم نزدیک‌تر به آرامش</span>
          <span>بررسی موجودی نسخه، بدون حساب کاربری بیمار</span>
        </div>
      </footer>
      <Dialog
        open={menuOpen}
        title="دسترسی‌های نسخه‌یاب"
        onClose={() => setMenuOpen(false)}
        className="navigation-dialog"
      >
        <nav id="public-mobile-menu" className="mobile-public-links" aria-label="ناوبری موبایل">
          {publicLinks.map(([path, label]) => (
            <Link key={path} to={path} onClick={() => setMenuOpen(false)}>
              {label}
              <ChevronLeft size={17} aria-hidden="true" />
            </Link>
          ))}
        </nav>
        <Link to="/request" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
          ثبت درخواست نسخه
          <ArrowLeft size={17} aria-hidden="true" />
        </Link>
      </Dialog>
    </div>
  );
};

interface NavigationItem {
  path: string;
  label: string;
  icon: LucideIcon;
}
interface CurrentUser {
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  pharmacyRegistrationStatus: string | null;
}
const pharmacyLinks: NavigationItem[] = [
  { path: '/pharmacy/dashboard', label: 'نمای کلی', icon: LayoutDashboard },
  { path: '/pharmacy/requests', label: 'درخواست‌های نسخه', icon: ClipboardList },
  { path: '/pharmacy/history', label: 'تاریخچه درخواست‌ها', icon: History },
  { path: '/pharmacy/registration-status', label: 'وضعیت ثبت‌نام', icon: FileCheck2 },
  { path: '/pharmacy/profile', label: 'اطلاعات و مدارک', icon: UserRound },
];
const adminLinks: NavigationItem[] = [
  { path: '/admin/dashboard', label: 'نمای کلی', icon: LayoutDashboard },
  { path: '/admin/prescriptions', label: 'درخواست‌های نسخه', icon: ClipboardList },
  { path: '/admin/pharmacy-registrations', label: 'بررسی ثبت‌نام‌ها', icon: FileCheck2 },
  { path: '/admin/pharmacies', label: 'داروخانه‌ها', icon: Building2 },
  { path: '/admin/users', label: 'کاربران و دسترسی‌ها', icon: UsersRound },
  { path: '/admin/insurance', label: 'بیمه‌ها', icon: ShieldCheck },
  { path: '/admin/logs', label: 'گزارش رویدادها', icon: Activity },
];

export const PortalLayout = ({ kind }: { kind: 'pharmacy' | 'admin' }) => {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const currentUser = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.request<CurrentUser>('/auth/me'),
    staleTime: 60_000,
  });
  const overview = useQuery({
    queryKey: [kind, 'dashboard'],
    queryFn: () =>
      api.request<{ unreadNotifications?: number; pendingRegistrations?: number }>(
        `/${kind}/dashboard`,
      ),
    enabled: kind === 'admin' || currentUser.data?.pharmacyRegistrationStatus === 'APPROVED',
    refetchInterval: () =>
      document.visibilityState === 'visible' && navigator.onLine ? 60_000 : false,
    refetchIntervalInBackground: false,
  });
  const links =
    kind === 'pharmacy'
      ? pharmacyLinks.filter(
          ({ path }) =>
            (!path.endsWith('profile') && !path.endsWith('registration-status')) ||
            currentUser.data?.role === 'PHARMACY_ADMIN',
        )
      : adminLinks;
  const title =
    links.find(({ path }) => location.pathname.startsWith(path))?.label ?? 'جزئیات درخواست';
  const subtitle = kind === 'admin' ? 'مدیریت سامانه' : 'پنل داروخانه';
  const badgeCount =
    kind === 'admin' ? overview.data?.pendingRegistrations : overview.data?.unreadNotifications;
  const badgePath = kind === 'admin' ? '/admin/pharmacy-registrations' : '/pharmacy/requests';

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      const refreshToken = await authStorage.getRefreshToken();
      let csrfToken = authStorage.getCsrfToken();
      if (!refreshToken && !csrfToken && !Capacitor.isNativePlatform()) {
        const csrf = await api.request<{ csrfToken: string }>('/auth/csrf');
        csrfToken = csrf.csrfToken;
        authStorage.setCsrfToken(csrfToken);
      }
      await api.request('/auth/logout', {
        method: 'POST',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
      authStorage.setAccessToken(null);
      await authStorage.setRefreshToken(null);
      authStorage.setCsrfToken(null);
      queryClient.clear();
      navigate(kind === 'pharmacy' ? '/pharmacy/login' : '/admin/login');
    } catch {
      setOpen(false);
      setLogoutError('خروج کامل انجام نشد. اتصال را بررسی کنید و دوباره تلاش کنید.');
    } finally {
      setLoggingOut(false);
    }
  };

  const navigation = (
    <>
      <span className="sidebar-label">فضای کار شما</span>
      <nav className="portal-nav" aria-label="فهرست پنل">
        {links.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={() => setOpen(false)}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
            {path === badgePath && Boolean(badgeCount) ? (
              <span className="nav-badge">{badgeCount?.toLocaleString('fa-IR')}</span>
            ) : null}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <ShieldCheck size={20} aria-hidden="true" />
          <span>
            اطلاعات بیماران را
            <br />
            محرمانه نگه داریم.
          </span>
        </div>
        <button
          className="logout-link"
          type="button"
          onClick={() => void logout()}
          disabled={loggingOut}
        >
          <LogOut size={18} aria-hidden="true" />
          {loggingOut ? 'در حال خروج…' : 'خروج از حساب'}
        </button>
      </div>
    </>
  );

  return (
    <>
      <OfflineBanner />
      <div className="portal-shell">
        <a className="skip-link" href="#main-content">
          رفتن به محتوای اصلی
        </a>
        <aside className="portal-sidebar">
          <div className="portal-brand">
            <Brand subtitle={subtitle} />
          </div>
          {navigation}
        </aside>
        <div className="portal-main">
          <header className="portal-topbar">
            <button
              className="icon-button mobile-menu"
              type="button"
              onClick={() => setOpen(true)}
              aria-label="باز کردن منو"
              aria-expanded={open}
            >
              <Menu size={21} />
            </button>
            <div className="portal-breadcrumb">
              <span>{subtitle}</span>
              <ChevronLeft size={15} aria-hidden="true" />
              <strong>{title}</strong>
            </div>
            <div className="topbar-actions">
              <span className="topbar-date">
                <CalendarDays size={16} aria-hidden="true" />
                {formatJalaliDate(new Date())}
              </span>
              <Link
                to={badgePath}
                className="icon-button notification-button"
                aria-label={kind === 'admin' ? 'ثبت‌نام‌های در انتظار بررسی' : 'درخواست‌های جدید'}
              >
                <Bell size={19} />
                {badgeCount ? (
                  <span className="notification-count">{badgeCount?.toLocaleString('fa-IR')}</span>
                ) : null}
              </Link>
              <div className="user-identity">
                <span className="user-avatar" aria-hidden="true">
                  {currentUser.data?.firstName?.charAt(0) || <UserRound size={19} />}
                </span>
                <span>
                  <strong>
                    {currentUser.data?.firstName
                      ? `${currentUser.data.firstName} ${currentUser.data.lastName}`
                      : subtitle}
                  </strong>
                  <small>{kind === 'admin' ? 'مدیر سامانه' : 'همکار داروخانه'}</small>
                </span>
              </div>
            </div>
          </header>
          <main className="portal-content" id="main-content">
            {logoutError ? (
              <div className="alert alert-error" role="alert">
                {logoutError}
              </div>
            ) : null}
            <Outlet />
          </main>
          <div className="portal-footnote">
            نسخه‌یاب<span>مدیریت ساده‌تر، رسیدگی دقیق‌تر</span>
          </div>
        </div>
        <nav className="portal-mobile-nav" aria-label="دسترسی سریع پنل">
          {links.slice(0, 3).map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path}>
              <Icon size={21} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
          <button type="button" onClick={() => setOpen(true)}>
            <Menu size={21} aria-hidden="true" />
            <span>بیشتر</span>
          </button>
        </nav>
        <Dialog
          open={open}
          title={subtitle}
          onClose={() => setOpen(false)}
          className="sidebar-drawer"
        >
          {navigation}
        </Dialog>
      </div>
    </>
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
      void Network.addListener('networkStatusChange', (status) => {
        if (!disposed) setOnline(status.connected);
      }).then((listener) => {
        if (disposed) void listener.remove();
        else removeNativeListener = () => listener.remove();
      });
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
      <WifiOff size={17} aria-hidden="true" />
      اتصال اینترنت برقرار نیست. اطلاعات فرم حفظ می‌شود؛ پس از اتصال دوباره تلاش کنید.
    </div>
  );
};
