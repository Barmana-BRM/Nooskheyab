import {
  ArrowLeft,
  ArrowUpLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileHeart,
  HeartHandshake,
  MoveLeft,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  {
    number: '۰۱',
    title: 'نسخه‌تان را ثبت کنید',
    description: 'اطلاعات نسخه و بیمه را در یک فرم کوتاه وارد کنید.',
    image: 'step-submit',
    alt: 'ثبت اطلاعات نسخه با تلفن همراه',
  },
  {
    number: '۰۲',
    title: 'بررسی را به داروخانه بسپارید',
    description: 'داروخانه‌های تأییدشده، امکان تأمین نسخه را بررسی می‌کنند.',
    image: 'step-review',
    alt: 'بررسی نسخه توسط داروساز',
  },
  {
    number: '۰۳',
    title: 'پاسخ‌ها را کنار هم ببینید',
    description: 'موجودی کامل، بخشی از نسخه یا عدم تأمین؛ شفاف و یک‌جا.',
    image: 'step-results',
    alt: 'مشاهده پاسخ داروخانه‌ها',
  },
  {
    number: '۰۴',
    title: 'با اطمینان مراجعه کنید',
    description: 'داروخانه مناسب را انتخاب کنید و برای دریافت نسخه مراجعه کنید.',
    image: 'step-select',
    alt: 'انتخاب داروخانه برای مراجعه حضوری',
  },
] as const;

const questions = [
  {
    title: 'برای ثبت نسخه باید حساب کاربری بسازم؟',
    answer:
      'خیر. شماره موبایل، کد ملی، کد رهگیری نسخه و اطلاعات بیمه را وارد می‌کنید. بعد از ثبت، یک کد پیگیری و لینک خصوصی برای مشاهده نتیجه دریافت می‌کنید.',
  },
  {
    title: 'کد رهگیری نسخه با کد پیگیری درخواست چه فرقی دارد؟',
    answer:
      'کد رهگیری نسخه را از پزشک یا سامانه نسخه الکترونیک دریافت کرده‌اید. کد پیگیری درخواست با RX شروع می‌شود و نسخه‌یاب پس از ثبت درخواست در اختیار شما می‌گذارد.',
  },
  {
    title: 'آیا ثبت درخواست به معنی آماده بودن داروهاست؟',
    answer:
      'خیر. ابتدا داروخانه‌ها امکان تأمین نسخه را بررسی می‌کنند. پاسخ هر داروخانه را در صفحه پیگیری می‌بینید و سپس می‌توانید یک داروخانه را انتخاب کنید.',
  },
  {
    title: 'بعد از انتخاب داروخانه چه اتفاقی می‌افتد؟',
    answer:
      'داروخانه منتخب در درخواست شما ثبت می‌شود و سایر پاسخ‌ها بسته می‌شوند. نشانی و ساعت کاری همان داروخانه را می‌بینید و برای دریافت نسخه حضوری مراجعه می‌کنید.',
  },
] as const;

export const LandingPage = () => (
  <main className="landing-page" id="main-content">
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <span aria-hidden="true" />
            یک قدم نزدیک‌تر به حالِ خوب
          </span>
          <h1 id="hero-title">
            قبل از مراجعه،
            <br />
            از موجود بودن نسخه
            <br />
            <span className="hero-highlight">
              مطمئن شوید
              <svg viewBox="0 0 340 15" preserveAspectRatio="none" aria-hidden="true">
                <path d="M4 11Q168-4 336 8" />
              </svg>
            </span>
          </h1>
          <p className="hero-description">
            از این داروخانه به آن داروخانه نروید. اطلاعات نسخه‌تان را ثبت کنید، پاسخ داروخانه‌ها را
            ببینید و بعد راهی شوید.
          </p>
          <div className="hero-actions">
            <Link to="/request" className="btn btn-primary btn-large">
              ثبت درخواست نسخه
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <Link to="/request/track" className="hero-track-link">
              قبلاً درخواست داده‌اید؟
              <span>
                پیگیری درخواست
                <ArrowUpLeft size={16} aria-hidden="true" />
              </span>
            </Link>
          </div>
          <div className="hero-reassurance">
            <CheckCircle2 size={17} aria-hidden="true" />
            بدون ثبت‌نام بیمار<span aria-hidden="true">·</span>انتخاب نهایی با شماست
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-art-background" aria-hidden="true">
            <span className="art-orbit orbit-one" />
            <span className="art-orbit orbit-two" />
            <span className="art-plus">+</span>
          </div>
          <div className="hero-art-label">
            <FileHeart size={20} aria-hidden="true" />
            <span>
              از نسخه تا داروخانه،<strong>یک مسیر ساده‌تر</strong>
            </span>
          </div>
          <img
            className="hero-image"
            src="/images/landing/hero-prescription.webp"
            alt="ارتباط نسخه ثبت‌شده در موبایل با داروخانه"
            width="1536"
            height="1024"
            sizes="(max-width: 767px) 100vw, 48vw"
            fetchPriority="high"
            decoding="async"
          />
          <div className="hero-privacy-card">
            <span className="soft-icon">
              <ShieldCheck size={23} aria-hidden="true" />
            </span>
            <div>
              <strong>اطلاعات شما، برای بررسی نسخه</strong>
              <span>فقط در دسترس داروخانه‌های مجاز</span>
            </div>
            <Check size={17} aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>

    <div className="benefit-strip">
      <div>
        <span className="benefit-icon">
          <Clock3 size={22} aria-hidden="true" />
        </span>
        <span>
          <strong>رفت‌وآمد کمتر</strong>
          <small>اول بررسی، بعد مراجعه</small>
        </span>
      </div>
      <div>
        <span className="benefit-icon">
          <ClipboardList size={22} aria-hidden="true" />
        </span>
        <span>
          <strong>پاسخ‌ها در یک نگاه</strong>
          <small>مقایسه ساده‌تر داروخانه‌ها</small>
        </span>
      </div>
      <div>
        <span className="benefit-icon">
          <HeartHandshake size={22} aria-hidden="true" />
        </span>
        <span>
          <strong>انتخاب با خیال راحت</strong>
          <small>تصمیم نهایی در اختیار شما</small>
        </span>
      </div>
    </div>

    <section className="section process-section" id="how-it-works" aria-labelledby="process-title">
      <div className="section-heading-row">
        <div className="section-heading">
          <span className="section-kicker">از کجا شروع کنم؟</span>
          <h2 id="process-title">چطور کار می‌کند؟</h2>
          <p>چهار قدم روشن، از ثبت نسخه تا انتخاب داروخانه.</p>
        </div>
        <Link className="text-link" to="/request">
          شروع ثبت درخواست
          <MoveLeft size={18} aria-hidden="true" />
        </Link>
      </div>
      <div className="steps">
        {steps.map((step) => (
          <article className="step" key={step.number}>
            <div className="step-top">
              <span className="step-number">{step.number}</span>
              <span className="step-connector" aria-hidden="true" />
            </div>
            <div className="step-media">
              <img
                src={'/images/landing/' + step.image + '.webp'}
                alt={step.alt}
                width="640"
                height="640"
                loading="lazy"
                decoding="async"
                sizes="(max-width: 540px) 75vw, (max-width: 900px) 42vw, 23vw"
              />
            </div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="care-section">
      <div className="section care-inner">
        <div className="care-art">
          <img
            src="/images/landing/step-results.webp"
            alt="مشاهده نتیجه بررسی نسخه در موبایل"
            width="640"
            height="640"
            loading="lazy"
            decoding="async"
          />
          <span className="care-note">
            <CheckCircle2 size={19} aria-hidden="true" />
            هر پاسخ، واضح و قابل پیگیری
          </span>
        </div>
        <div className="care-copy">
          <span className="section-kicker">کمی آرامش، میان شلوغی روز</span>
          <h2>
            وقتتان را برای سلامتی بگذارید،
            <br />
            نه جست‌وجوی داروخانه.
          </h2>
          <p>
            وقتی نسخه دارید، دانستن اینکه کجا می‌توانید آن را تهیه کنید، یک دغدغه کمتر است. نسخه‌یاب
            پاسخ داروخانه‌ها را کنار هم می‌گذارد تا با اطلاعات روشن‌تری تصمیم بگیرید.
          </p>
          <ul className="care-list">
            <li>
              <Check size={17} aria-hidden="true" />
              مشاهده موجودی کامل یا بخشی از نسخه
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              دیدن توضیحات، نشانی و ساعت کاری داروخانه
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              پیگیری با لینک خصوصی، بدون ساختن حساب
            </li>
          </ul>
          <Link to="/request" className="text-link">
            نسخه‌ام را ثبت می‌کنم
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>

    <section className="section pharmacy-section" aria-labelledby="pharmacy-title">
      <div className="pharmacy-callout">
        <div className="pharmacy-callout-copy">
          <span className="section-kicker">برای همکاران داروخانه</span>
          <h2 id="pharmacy-title">شما هم همراه نسخه‌یاب باشید.</h2>
          <p>
            درخواست‌ها را در یک پنل ببینید، امکان تأمین را بررسی کنید و پاسخ روشن‌تری به بیماران
            بدهید.
          </p>
          <div className="button-row">
            <Link to="/pharmacy/register" className="btn btn-light">
              ثبت‌نام داروخانه
              <ArrowLeft size={18} aria-hidden="true" />
            </Link>
            <Link to="/pharmacy/login" className="callout-login">
              ورود به پنل
              <ChevronDown size={16} aria-hidden="true" />
            </Link>
          </div>
          <small>دسترسی به نسخه‌ها پس از بررسی و تأیید مدارک فعال می‌شود.</small>
        </div>
        <div className="pharmacy-callout-art">
          <img
            src="/images/landing/step-review.webp"
            alt="داروساز در حال بررسی نسخه در داروخانه"
            width="640"
            height="640"
            loading="lazy"
            decoding="async"
          />
          <span>
            <Building2 size={18} aria-hidden="true" />
            رسیدگی دقیق‌تر، از یک پنل ساده
          </span>
        </div>
      </div>
    </section>

    <section className="section faq-section" id="questions" aria-labelledby="faq-title">
      <div className="section-heading">
        <span className="section-kicker">شاید سؤال شما هم باشد</span>
        <h2 id="faq-title">قبل از ثبت نسخه بدانید</h2>
        <p>پاسخ چند سؤال کوتاه، برای شروعی راحت‌تر.</p>
        <Link to="/request" className="text-link">
          آماده‌اید؟ شروع کنیم
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
      </div>
      <div className="faq-list">
        {questions.map((question) => (
          <details className="faq-item" key={question.title}>
            <summary>
              {question.title}
              <ChevronDown size={19} aria-hidden="true" />
            </summary>
            <p>{question.answer}</p>
          </details>
        ))}
      </div>
    </section>
  </main>
);
