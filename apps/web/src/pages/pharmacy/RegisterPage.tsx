import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm, type FieldPath } from 'react-hook-form';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  ShieldCheck,
} from 'lucide-react';
import type { z } from 'zod';
import { pharmacyRegistrationSchema } from '@pharmacy-mvp/validation';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  FormSection,
  Input,
  PageTitle,
  PasswordInput,
  Textarea,
} from '../../components/ui';
import { formatJalaliDate } from '../../lib/date';

type RegistrationInput = z.infer<typeof pharmacyRegistrationSchema>;
const stepLabels = ['اطلاعات حساب', 'اطلاعات داروخانه', 'اطلاعات مجوز', 'بازبینی و ثبت'];
const stepFields: FieldPath<RegistrationInput>[][] = [
  ['firstName', 'lastName', 'username', 'password', 'mobile'],
  [
    'pharmacyName',
    'technicalManager',
    'technicalManagerIdentifier',
    'phone',
    'province',
    'city',
    'postalCode',
    'address',
    'workingHours',
  ],
  ['licenseNumber', 'licenseExpirationDate'],
];
export const RegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const form = useForm<RegistrationInput>({
    resolver: zodResolver(pharmacyRegistrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      password: '',
      mobile: '',
      pharmacyName: '',
      technicalManager: '',
      technicalManagerIdentifier: null,
      pharmacyIdentifier: null,
      licenseNumber: '',
      licenseExpirationDate: '',
      phone: '',
      province: '',
      city: '',
      address: '',
      postalCode: '',
      workingHours: '',
    },
  });
  const mutation = useMutation({
    mutationFn: (value: RegistrationInput) =>
      api.request('/pharmacy/register', { method: 'POST', body: JSON.stringify(value) }),
    onSuccess: (_, value) =>
      navigate('/pharmacy/login', {
        replace: true,
        state: { registered: true, username: value.username },
      }),
  });
  const advance = async () => {
    const fields = stepFields[step];
    if (fields && (await form.trigger(fields, { shouldFocus: true })))
      setStep((value) => value + 1);
  };
  const errorFor = (field: FieldPath<RegistrationInput>) => {
    const message = form.formState.errors[field]?.message;
    return message
      ? /[\u0600-\u06ff]/.test(message)
        ? message
        : 'این مورد را کامل و درست وارد کنید.'
      : undefined;
  };
  const values = form.getValues();
  return (
    <main className="form-page form-page-wide" id="main-content">
      <PageTitle
        eyebrow="همراهی برای یک مراجعه آسان‌تر"
        title="ثبت‌نام داروخانه"
        description="اطلاعات داروخانه را در چهار قدم ثبت کنید. بعد از ورود به پنل، مدارک را برای بررسی ارسال می‌کنید."
      />
      <ol className="registration-steps" aria-label="مراحل ثبت‌نام">
        {stepLabels.map((label, index) => (
          <li
            key={label}
            className={index === step ? 'current' : index < step ? 'complete' : ''}
            aria-current={index === step ? 'step' : undefined}
          >
            <span>
              {index < step ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                (index + 1).toLocaleString('fa-IR')
              )}
            </span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>
      <div className="form-layout">
        <Card>
          <form
            noValidate
            onSubmit={(event) => {
              if (step < 3) {
                event.preventDefault();
                void advance();
                return;
              }
              void form.handleSubmit(
                (value) => {
                  if (!mutation.isPending) mutation.mutate(value);
                },
                (errors) => {
                  const invalidStep = stepFields.findIndex((fields) =>
                    fields.some((field) => Boolean(errors[field])),
                  );
                  if (invalidStep >= 0) setStep(invalidStep);
                },
              )(event);
            }}
          >
            {mutation.isError ? (
              <div className="error-summary" role="alert">
                ثبت حساب انجام نشد. اطلاعات را بررسی کنید؛ ممکن است نام کاربری، موبایل یا شماره مجوز
                قبلاً ثبت شده باشد.
              </div>
            ) : null}
            {step === 0 ? (
              <FormSection
                title="حساب کاربری شما"
                description="این اطلاعات برای ورود مسئول حساب داروخانه استفاده می‌شود."
              >
                <Input
                  label="نام"
                  autoComplete="given-name"
                  required
                  {...form.register('firstName')}
                  error={errorFor('firstName')}
                />
                <Input
                  label="نام خانوادگی"
                  autoComplete="family-name"
                  required
                  {...form.register('lastName')}
                  error={errorFor('lastName')}
                />
                <Input
                  label="شماره موبایل"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  dir="ltr"
                  placeholder="0912 345 6789"
                  required
                  {...form.register('mobile')}
                  error={errorFor('mobile')}
                />
                <Input
                  label="نام کاربری"
                  autoComplete="username"
                  dir="ltr"
                  placeholder="مثلاً pharmacy_name"
                  required
                  {...form.register('username')}
                  error={errorFor('username')}
                  hint="حروف انگلیسی، عدد، نقطه یا خط تیره"
                />
                <div className="full">
                  <PasswordInput
                    label="رمز عبور"
                    autoComplete="new-password"
                    required
                    {...form.register('password')}
                    error={errorFor('password')}
                    hint="حداقل ۱۰ کاراکتر؛ از یک رمز غیرقابل حدس استفاده کنید."
                  />
                </div>
              </FormSection>
            ) : null}
            {step === 1 ? (
              <FormSection
                title="مشخصات داروخانه"
                description="نشانی و ساعت کاری به بیماران برای انتخاب و مراجعه کمک می‌کند."
              >
                <Input
                  label="نام داروخانه"
                  required
                  {...form.register('pharmacyName')}
                  error={errorFor('pharmacyName')}
                />
                <Input
                  label="نام مسئول فنی"
                  required
                  {...form.register('technicalManager')}
                  error={errorFor('technicalManager')}
                />
                <Input
                  label="شناسه مسئول فنی (اختیاری)"
                  {...form.register('technicalManagerIdentifier')}
                  error={errorFor('technicalManagerIdentifier')}
                />
                <Input
                  label="تلفن ثابت (اختیاری)"
                  inputMode="tel"
                  dir="ltr"
                  {...form.register('phone')}
                  error={errorFor('phone')}
                />
                <Input
                  label="استان"
                  required
                  {...form.register('province')}
                  error={errorFor('province')}
                />
                <Input label="شهر" required {...form.register('city')} error={errorFor('city')} />
                <Input
                  label="کد پستی"
                  inputMode="numeric"
                  maxLength={10}
                  dir="ltr"
                  required
                  {...form.register('postalCode')}
                  error={errorFor('postalCode')}
                />
                <Input
                  label="ساعت کاری"
                  placeholder="مثلاً شنبه تا پنجشنبه، ۸ تا ۲۲"
                  required
                  {...form.register('workingHours')}
                  error={errorFor('workingHours')}
                />
                <Textarea
                  label="نشانی داروخانه"
                  className="full"
                  autoComplete="street-address"
                  required
                  {...form.register('address')}
                  error={errorFor('address')}
                />
              </FormSection>
            ) : null}
            {step === 2 ? (
              <FormSection
                title="اطلاعات مجوز"
                description="اطلاعات را مطابق پروانه داروخانه وارد کنید. تصویر مجوز را پس از ورود بارگذاری می‌کنید."
              >
                <Input
                  label="شماره مجوز"
                  required
                  {...form.register('licenseNumber')}
                  error={errorFor('licenseNumber')}
                />
                <Input
                  label="تاریخ اعتبار مجوز"
                  type="date"
                  required
                  {...form.register('licenseExpirationDate')}
                  error={errorFor('licenseExpirationDate')}
                />
                <div className="notice notice-icon full">
                  <FileCheck2 size={20} aria-hidden="true" />
                  <p>
                    پس از ثبت حساب، وارد پنل شوید و تصویر مجوز داروخانه را بارگذاری کنید. دسترسی به
                    نسخه‌ها بعد از تأیید مدیریت فعال می‌شود.
                  </p>
                </div>
              </FormSection>
            ) : null}
            {step === 3 ? (
              <div>
                <div className="review-heading">
                  <CheckCircle2 size={26} aria-hidden="true" />
                  <div>
                    <h2>همه‌چیز را یک بار مرور کنید</h2>
                    <p>در صورت نیاز به اصلاح، به مرحله قبل برگردید.</p>
                  </div>
                </div>
                <dl className="detail-grid">
                  <ReviewItem label="نام داروخانه" value={values.pharmacyName} />
                  <ReviewItem label="مسئول فنی" value={values.technicalManager} />
                  <ReviewItem
                    label="نام مسئول حساب"
                    value={values.firstName + ' ' + values.lastName}
                  />
                  <ReviewItem label="نام کاربری" value={values.username} />
                  <ReviewItem label="شماره موبایل" value={values.mobile} />
                  <ReviewItem label="شماره مجوز" value={values.licenseNumber} />
                  <ReviewItem
                    label="اعتبار مجوز"
                    value={
                      values.licenseExpirationDate
                        ? formatJalaliDate(values.licenseExpirationDate)
                        : '—'
                    }
                  />
                  <ReviewItem label="استان و شهر" value={values.province + '، ' + values.city} />
                  <ReviewItem label="نشانی" value={values.address} />
                  <ReviewItem label="ساعت کاری" value={values.workingHours} />
                </dl>
                <div className="notice notice-icon">
                  <ShieldCheck size={19} aria-hidden="true" />
                  <p>
                    با ثبت حساب، اطلاعات برای آغاز فرایند عضویت ذخیره می‌شود. تأیید نهایی پس از
                    ارسال مدارک و بررسی مدیریت انجام می‌شود.
                  </p>
                </div>
              </div>
            ) : null}
            <div className="form-actions">
              <div>
                {step > 0 ? (
                  <Button
                    className="btn-secondary"
                    disabled={mutation.isPending}
                    onClick={() => setStep((value) => value - 1)}
                  >
                    <ArrowRight size={17} aria-hidden="true" />
                    مرحله قبل
                  </Button>
                ) : (
                  <Link to="/pharmacy/login" className="text-link">
                    حساب دارم، وارد می‌شوم
                  </Link>
                )}
              </div>
              <Button type="submit" loading={mutation.isPending}>
                {step === 3 ? 'تأیید و ساخت حساب' : 'ادامه'}
                <ArrowLeft size={18} aria-hidden="true" />
              </Button>
            </div>
          </form>
        </Card>
        <aside className="form-guide">
          <img
            src="/images/landing/step-review.webp"
            alt=""
            width="640"
            height="640"
            loading="lazy"
          />
          <h2>به جمع همراهان نسخه‌یاب بپیوندید</h2>
          <p>یک فضای منظم برای دریافت درخواست، بررسی نسخه و پاسخ‌دادن به بیماران.</p>
          <ul className="guide-list">
            <li>
              <Building2 size={18} aria-hidden="true" />
              ثبت اطلاعات داروخانه
            </li>
            <li>
              <ClipboardList size={18} aria-hidden="true" />
              بارگذاری مدارک در پنل
            </li>
            <li>
              <ShieldCheck size={18} aria-hidden="true" />
              بررسی و تأیید مدیریت
            </li>
          </ul>
          <div className="guide-footnote">
            <FileCheck2 size={17} aria-hidden="true" />
            <p>تا پیش از دکمه نهایی، اطلاعات فقط در همین فرم نگه داشته می‌شود.</p>
          </div>
        </aside>
      </div>
    </main>
  );
};
const ReviewItem = ({ label, value }: { label: string; value: string }) => (
  <div className="detail-item">
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);
