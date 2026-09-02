import { ArrowLeft, CheckCircle2, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card } from '../../components/ui';

export const LandingPage = () => (
  <>
    <section className="hero">
      <div className="hero-inner">
        <div>
          <p className="eyebrow">سامانه آنلاین بررسی موجودی نسخه</p>
          <h1>قبل از مراجعه، از موجود بودن نسخه مطمئن شوید</h1>
          <p>
            اطلاعات نسخه خود را ثبت کنید تا داروخانه‌های عضو سامانه امکان تأمین آن را بررسی کنند.
          </p>
          <div className="button-row">
            <Link to="/request">
              <Button className="btn-light">
                <ClipboardList size={18} />
                ثبت درخواست نسخه
              </Button>
            </Link>
            <Link
              to="/request/track"
              className="btn btn-secondary"
              style={{
                color: '#fff',
                borderColor: 'rgba(255,255,255,.35)',
                background: 'rgba(255,255,255,.08)',
              }}
            >
              پیگیری درخواست
            </Link>
          </div>
        </div>
        <div className="hero-card">
          <CheckCircle2 size={28} />
          <p>
            نتیجه داروخانه‌ها را از یک مسیر شفاف ببینید و پیش از حرکت، داروخانه مناسب خود را انتخاب
            کنید.
          </p>
        </div>
      </div>
    </section>
    <section className="section">
      <div className="section-heading">
        <h2>چطور کار می‌کند؟</h2>
        <p>
          فرآیند کوتاه و روشن است؛ اطلاعات حساس شما فقط از مسیر امن سامانه به داروخانه‌های فعال
          ارسال می‌شود.
        </p>
      </div>
      <div className="steps">
        <div className="step">
          <span className="step-number">۱</span>
          <h3>ثبت اطلاعات نسخه</h3>
          <p>شماره موبایل، کد ملی، کد رهگیری و بیمه را وارد کنید.</p>
        </div>
        <div className="step">
          <span className="step-number">۲</span>
          <h3>بررسی توسط داروخانه‌ها</h3>
          <p>داروخانه‌های تأییدشده امکان تأمین نسخه را بررسی می‌کنند.</p>
        </div>
        <div className="step">
          <span className="step-number">۳</span>
          <h3>دریافت نتیجه</h3>
          <p>پاسخ کامل، ناقص یا عدم امکان تأمین را مشاهده کنید.</p>
        </div>
        <div className="step">
          <span className="step-number">۴</span>
          <h3>مراجعه به داروخانه منتخب</h3>
          <p>یک پاسخ مناسب را انتخاب کنید و با اطمینان مراجعه کنید.</p>
        </div>
      </div>
    </section>
    <section className="section" style={{ paddingTop: 0 }}>
      <Card>
        <div className="button-row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, color: '#062D2B', fontSize: '1.25rem' }}>
              ساده، شفاف و بدون حساب کاربری
            </h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              پس از ثبت، کد پیگیری و یک لینک امن برای مشاهده وضعیت دریافت می‌کنید.
            </p>
          </div>
          <Link to="/request">
            <Button>
              شروع ثبت درخواست <ArrowLeft size={17} />
            </Button>
          </Link>
        </div>
      </Card>
    </section>
  </>
);
