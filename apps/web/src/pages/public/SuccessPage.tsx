import { ArrowLeft, Check, CheckCircle2, Clock3, Copy, Link2, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Card, StatusBadge } from '../../components/ui';
import { formatJalaliDateTime } from '../../lib/date';

interface SuccessState {
  publicId: string;
  accessToken: string;
  expiresAt: string;
  statusUrl: string;
}
export const SuccessPage = () => {
  const location = useLocation();
  const state = location.state as SuccessState | null;
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [copyError, setCopyError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  if (!state)
    return (
      <main className="success-page" id="main-content">
        <Card className="success-card">
          <div className="track-heading-icon">
            <Link2 size={26} aria-hidden="true" />
          </div>
          <h1>درخواستتان را پیگیری کنید</h1>
          <p>اگر قبلاً نسخه‌ای ثبت کرده‌اید، با لینک خصوصی خود آخرین وضعیت آن را ببینید.</p>
          <div className="success-actions">
            <Link to="/request/track" className="btn btn-primary">
              پیگیری درخواست
              <ArrowLeft size={18} aria-hidden="true" />
            </Link>
            <Link to="/request" className="btn btn-secondary">
              ثبت درخواست جدید
            </Link>
          </div>
        </Card>
      </main>
    );
  const statusPath =
    '/request/' + state.publicId + '?token=' + encodeURIComponent(state.accessToken);
  const copy = async (kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(
        kind === 'code' ? state.publicId : new URL(statusPath, window.location.origin).href,
      );
      setCopied(kind);
      setCopyError(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 2500);
    } catch {
      setCopyError(true);
    }
  };
  return (
    <main className="success-page" id="main-content">
      <Card className="success-card">
        <span className="success-icon">
          <CheckCircle2 size={37} aria-hidden="true" />
        </span>
        <h1>درخواست شما ثبت شد</h1>
        <p>یک قدم جلو رفتید. حالا نوبت بررسی داروخانه‌هاست.</p>
        <StatusBadge status="PENDING" label="در انتظار بررسی داروخانه" />
        <div className="code-box">
          <div>
            <small>کد پیگیری درخواست</small>
            <strong>{state.publicId}</strong>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={() => void copy('code')}
            aria-label="کپی کد پیگیری"
          >
            {copied === 'code' ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
        <div className="success-meta">
          <Clock3 size={16} aria-hidden="true" />
          <span>اعتبار درخواست تا {formatJalaliDateTime(state.expiresAt)}</span>
        </div>
        <div className="notice notice-icon">
          <ShieldCheck size={19} aria-hidden="true" />
          <p>
            لینک پیگیری را ذخیره کنید. برای دیدن پاسخ‌ها در دستگاه دیگر، به همین لینک خصوصی نیاز
            دارید.
          </p>
        </div>
        <div className="success-actions">
          <Link className="btn btn-primary" to={statusPath}>
            مشاهده وضعیت درخواست
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <button className="btn btn-secondary" type="button" onClick={() => void copy('link')}>
            {copied === 'link' ? (
              <Check size={17} aria-hidden="true" />
            ) : (
              <Link2 size={17} aria-hidden="true" />
            )}
            {copied === 'link' ? 'لینک پیگیری کپی شد' : 'کپی لینک پیگیری خصوصی'}
          </button>
        </div>
        <p className="copy-feedback" role="status">
          {copyError
            ? 'کپی ممکن نشد؛ از دکمه مشاهده وضعیت استفاده کنید.'
            : copied === 'code'
              ? 'کد پیگیری کپی شد.'
              : ''}
        </p>
      </Card>
      <Link to="/" className="text-link">
        بازگشت به صفحه اصلی
      </Link>
    </main>
  );
};
