import { CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Button, Card } from '../../components/ui';
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
  const [copied, setCopied] = useState(false);
  if (!state)
    return (
      <main className="success-page">
        <Card>
          <h1>کد پیگیری پیدا نشد</h1>
          <p className="muted">برای ثبت درخواست جدید به فرم برگردید.</p>
          <Link to="/request">
            <Button>ثبت درخواست جدید</Button>
          </Link>
        </Card>
      </main>
    );
  const copy = async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(state.publicId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <main className="success-page">
      <div className="success-icon">
        <CheckCircle2 size={42} />
      </div>
      <h1>درخواست شما ثبت شد</h1>
      <p className="muted">داروخانه‌های تأییدشده درخواست شما را بررسی می‌کنند.</p>
      <div className="code-box">
        <strong>{state.publicId}</strong>
        <button className="icon-button" onClick={copy} aria-label="کپی کد پیگیری">
          <Copy size={17} />
        </button>
      </div>
      {copied ? <p className="muted">کد کپی شد.</p> : null}
      <Card style={{ textAlign: 'right' }}>
        <p style={{ marginTop: 0 }}>
          اعتبار درخواست تا <strong>{formatJalaliDateTime(state.expiresAt)}</strong> است.
        </p>
        <p className="muted" style={{ fontSize: '.85rem' }}>
          کد پیگیری و لینک وضعیت را نزد خود نگه دارید؛ توکن دسترسی فقط همین بار نمایش داده می‌شود.
        </p>
        <div className="button-row">
          <Link to={`/request/${state.publicId}?token=${encodeURIComponent(state.accessToken)}`}>
            <Button>
              مشاهده وضعیت <ExternalLink size={16} />
            </Button>
          </Link>
          <Link to="/">
            <Button className="btn-secondary">بازگشت به خانه</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
};
