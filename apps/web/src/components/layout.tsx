import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, ShieldCheck, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { authStorage } from '../lib/auth';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export const PublicLayout = () => <div className="public-shell"><header className="site-header"><Link to="/" className="brand-mark"><span className="brand-icon"><Stethoscope size={20} /></span><span>نسخه‌یار</span></Link><nav><Link to="/request">ثبت درخواست</Link><Link to="/pharmacy/login">ورود داروخانه</Link></nav></header><Outlet /><footer className="site-footer">اطلاعات نسخه فقط برای بررسی تأمین در سامانه استفاده می‌شود.</footer></div>;

export const PortalLayout = ({ kind }: { kind: 'pharmacy' | 'admin' }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const pharmacyLinks: Array<[string, string]> = [['/pharmacy/dashboard', 'داشبورد'], ['/pharmacy/requests', 'درخواست‌ها'], ['/pharmacy/history', 'تاریخچه'], ['/pharmacy/profile', 'پروفایل']];
  const adminLinks: Array<[string, string]> = [['/admin/dashboard', 'داشبورد'], ['/admin/prescriptions', 'درخواست‌های نسخه'], ['/admin/pharmacy-registrations', 'ثبت‌نام داروخانه‌ها'], ['/admin/pharmacies', 'داروخانه‌ها'], ['/admin/users', 'کاربران'], ['/admin/insurance', 'بیمه‌ها'], ['/admin/logs', 'گزارش رویدادها']];
  const links = kind === 'pharmacy' ? pharmacyLinks : adminLinks;
  const logout = async () => { await api.request('/auth/logout', { method: 'POST', body: JSON.stringify({}) }).catch(() => undefined); authStorage.setAccessToken(null); await authStorage.setRefreshToken(null); navigate(kind === 'pharmacy' ? '/pharmacy/login' : '/admin/login'); };
  return <div className="portal-shell"><aside className={`portal-sidebar ${open ? 'open' : ''}`}><div className="portal-brand"><span className="brand-icon">{kind === 'admin' ? <ShieldCheck size={20} /> : <Stethoscope size={20} />}</span>{kind === 'admin' ? 'مدیریت سامانه' : 'پنل داروخانه'}</div><nav className="portal-nav">{links.map(([path, label]) => <NavLink key={path} to={path} className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setOpen(false)}>{label}</NavLink>)}</nav><button className="logout-link" onClick={logout}><LogOut size={17} />خروج</button></aside><div className="portal-main"><header className="portal-topbar"><button className="icon-button mobile-menu" onClick={() => setOpen((value) => !value)} aria-label="باز کردن منو"><Menu size={20} /></button><span>{links.find(([path]) => location.pathname.startsWith(path))?.[1] ?? 'داشبورد'}</span><span className="topbar-dot" /></header><main className="portal-content"><Outlet /></main></div>{open ? <button className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="بستن منو" /> : null}</div>;
};
