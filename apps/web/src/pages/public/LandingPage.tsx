import { ArrowLeft, CheckCircle2, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card } from '../../components/ui';

const steps = [
  {
    number: '۱',
    title: 'ثبت اطلاعات نسخه',
    description: 'شماره موبایل، کد ملی، کد رهگیری و بیمه را وارد کنید.',
    image: '/images/landing/step-submit.webp',
    alt: 'ثبت اطلاعات نسخه در تلفن همراه',
  },
  {
    number: '۲',
    title: 'بررسی توسط داروخانه‌ها',
    description: 'داروخانه‌های تأییدشده امکان تأمین نسخه را بررسی می‌کنند.',
    image: '/images/landing/step-review.webp',
    alt: 'بررسی نسخه در داروخانه و تأیید اطلاعات',
  },
  {
    number: '۳',
    title: 'دریافت نتیجه',
    description: 'پاسخ کامل، ناقص یا عدم امکان تأمین را مشاهده کنید.',
    image: '/images/landing/step-results.webp',
    alt: 'نمایش نتیجه‌های مختلف بررسی نسخه',
  },
  {
    number: '۴',
    title: 'مراجعه به داروخانه منتخب',
    description: 'یک پاسخ مناسب را انتخاب کنید و با اطمینان مراجعه کنید.',
    image: '/images/landing/step-select.webp',
    alt: 'انتخاب داروخانه روی نقشه و دریافت مسیر',
  },
] as const;

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
          <div className="hero-visual">
            <img
              src="/images/landing/hero-prescription.webp"
              alt="مسیر ثبت نسخه تا بررسی و تأیید داروخانه"
              width="1200"
              height="768"
              fetchPriority="high"
              decoding="async"
            />
          </div>
          <div className="hero-card-content">
            <CheckCircle2 size={28} aria-hidden="true" />
            <p>
              نتیجه داروخانه‌ها را از یک مسیر شفاف ببینید و پیش از حرکت، داروخانه مناسب خود را انتخاب
              کنید.
            </p>
          </div>
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
        {steps.map((step) => (
          <article className="step" key={step.number}>
            <div className="step-media">
              <img
                src={step.image}
                alt={step.alt}
                width="640"
                height="640"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="step-content">
              <span className="step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
    <section className="section" style={{ paddingTop: 0 }}>
      <Card className="cta-card">
        <div className="cta-content">
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
        <div className="cta-visual" aria-hidden="true">
          <img
            src="/images/landing/step-select.webp"
            alt=""
            width="640"
            height="640"
            loading="lazy"
            decoding="async"
          />
        </div>
      </Card>
    </section>
  </>
);
