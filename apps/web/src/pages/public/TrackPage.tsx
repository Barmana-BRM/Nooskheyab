import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Link2, LockKeyhole, Search } from 'lucide-react';
import { Button, Card, Input, PageTitle } from '../../components/ui';
import { writePatientToken } from '../../lib/patient-token';

export const TrackPage = () => {
  const [method, setMethod] = useState<'link' | 'code'>('link');
  const [link, setLink] = useState('');
  const [publicId, setPublicId] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const submit = async () => {
    setError('');
    let requestId = publicId.trim().toUpperCase();
    let accessToken = token.trim();
    if (method === 'link') {
      try {
        const url = new URL(link.trim(), window.location.origin);
        const match = /^\/request\/(RX-[A-Za-z0-9]{8})$/.exec(url.pathname);
        if (!match?.[1] || !['http:', 'https:', 'pharmacy-mvp:'].includes(url.protocol))
          throw new Error('invalid');
        requestId = match[1].toUpperCase();
        accessToken = url.searchParams.get('token') ?? '';
      } catch {
        setError('لینک پیگیری کامل و معتبر را وارد کنید.');
        return;
      }
    }
    if (!/^RX-[A-Z0-9]{8}$/.test(requestId) || !/^[A-Za-z0-9_-]{43}$/.test(accessToken)) {
      setError(
        method === 'link'
          ? 'این لینک کامل نیست. لینک خصوصی دریافت‌شده هنگام ثبت درخواست را وارد کنید.'
          : 'کد پیگیری و کد دسترسی را بررسی کنید.',
      );
      return;
    }
    setLoading(true);
    try {
      await writePatientToken(requestId, accessToken);
      navigate('/request/' + requestId);
    } catch {
      setLoading(false);
      setError('ذخیره دسترسی در این مرورگر ممکن نیست. تنظیمات حریم خصوصی مرورگر را بررسی کنید.');
    }
  };
  return (
    <main className="form-page track-page" id="main-content">
      <div className="track-heading-icon">
        <Search size={27} aria-hidden="true" />
      </div>
      <PageTitle
        title="پیگیری درخواست"
        description="پاسخ داروخانه‌ها و آخرین وضعیت نسخه‌تان را ببینید."
      />
      <Card>
        <div className="track-method" aria-label="روش پیگیری">
          <button
            type="button"
            aria-pressed={method === 'link'}
            onClick={() => {
              setMethod('link');
              setError('');
            }}
          >
            با لینک پیگیری
          </button>
          <button
            type="button"
            aria-pressed={method === 'code'}
            onClick={() => {
              setMethod('code');
              setError('');
            }}
          >
            با کد پیگیری
          </button>
        </div>
        <form
          className="track-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!loading) void submit();
          }}
        >
          {method === 'link' ? (
            <Input
              label="لینک پیگیری خصوصی"
              type="text"
              inputMode="url"
              dir="ltr"
              autoComplete="off"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="لینکی که پس از ثبت درخواست دریافت کردید"
              hint="لینک را کامل کپی کنید و اینجا قرار دهید."
            />
          ) : (
            <>
              <Input
                label="کد پیگیری درخواست"
                dir="ltr"
                autoComplete="off"
                value={publicId}
                onChange={(event) => setPublicId(event.target.value)}
                placeholder="RX-XXXXXXXX"
                maxLength={11}
              />
              <Input
                label="کد دسترسی"
                type="password"
                autoComplete="off"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="کد خصوصی موجود در لینک پیگیری شما"
                hint="کد دسترسی در لینک خصوصی شما بعد از token= قرار دارد."
              />
            </>
          )}
          {error ? (
            <div className="error-summary" role="alert">
              {error}
            </div>
          ) : null}
          <Button type="submit" loading={loading}>
            مشاهده وضعیت درخواست
            <ArrowLeft size={18} aria-hidden="true" />
          </Button>
          <div className="notice notice-icon">
            <LockKeyhole size={17} aria-hidden="true" />
            <p>لینک پیگیری، دسترسی به اطلاعات نسخه شماست. آن را فقط نزد خود نگه دارید.</p>
          </div>
        </form>
      </Card>
      <p className="auth-security">
        <Link2 size={15} aria-hidden="true" />
        کد پیگیری درخواست با کد رهگیری نسخه پزشک متفاوت است.
      </p>
    </main>
  );
};
