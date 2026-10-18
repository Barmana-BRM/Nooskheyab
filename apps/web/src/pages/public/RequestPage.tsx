import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock3,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { prescriptionCreateSchema, type PrescriptionCreateInput } from '@pharmacy-mvp/validation';
import { ApiClientError } from '@pharmacy-mvp/api-client';
import { api } from '../../lib/api';
import { Button, Card, FormSection, Input, PageTitle, Select, Textarea } from '../../components/ui';

interface Insurance {
  id: string;
  name: string;
}
interface CreatedPrescription {
  publicId: string;
  accessToken: string;
  status: string;
  statusUrl: string;
  expiresAt: string;
}

export const RequestPage = () => {
  const navigate = useNavigate();
  const idempotencyKey = useRef(crypto.randomUUID());
  const base = useQuery({
    queryKey: ['insurance', 'base'],
    queryFn: () => api.request<Insurance[]>('/insurance/base'),
    staleTime: 300_000,
  });
  const supplementary = useQuery({
    queryKey: ['insurance', 'supplementary'],
    queryFn: () => api.request<Insurance[]>('/insurance/supplementary'),
    staleTime: 300_000,
  });
  const form = useForm<PrescriptionCreateInput>({
    resolver: zodResolver(prescriptionCreateSchema),
    defaultValues: {
      mobile: '',
      nationalId: '',
      prescriptionTrackingCode: '',
      baseInsuranceId: '',
      hasSupplementaryInsurance: false,
      supplementaryInsuranceId: null,
      supplementaryDescription: null,
      patientDescription: null,
      honeypot: '',
    },
  });
  const create = useMutation({
    mutationFn: (value: PrescriptionCreateInput) =>
      api.request<CreatedPrescription>('/prescriptions', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey.current },
        body: JSON.stringify(value),
      }),
    onSuccess: (data) => navigate('/request/success', { state: data }),
    onError: (error) => {
      if (error instanceof ApiClientError && error.fields) {
        for (const [field, message] of Object.entries(error.fields)) {
          if (field in form.getValues())
            form.setError(field as keyof PrescriptionCreateInput, { type: 'server', message });
        }
      }
    },
  });
  const hasSupplementary = form.watch('hasSupplementaryInsurance');
  const errors = Object.entries(form.formState.errors).flatMap(([field, error]) =>
    typeof error?.message === 'string' ? [{ field, message: error.message }] : [],
  );
  const changeInsurance = (value: boolean) => {
    if (!value) {
      form.setValue('supplementaryInsuranceId', null);
      form.setValue('supplementaryDescription', null);
      form.clearErrors(['supplementaryInsuranceId', 'supplementaryDescription']);
    }
    form.setValue('hasSupplementaryInsurance', value, { shouldValidate: true });
  };
  return (
    <main className="form-page form-page-wide" id="main-content">
      <Link to="/" className="form-breadcrumb">
        خانه
        <ChevronLeft size={14} aria-hidden="true" />
        <span>ثبت درخواست نسخه</span>
      </Link>
      <PageTitle
        eyebrow="اولین قدم، برای یک مراجعه مطمئن‌تر"
        title="ثبت درخواست نسخه"
        description="اطلاعات زیر را وارد کنید. داروخانه‌ها نسخه‌تان را بررسی می‌کنند و نتیجه را همین‌جا می‌بینید."
      />
      <div className="form-layout">
        <Card>
          <form
            className="request-form"
            onSubmit={form.handleSubmit((value) => {
              if (!create.isPending && navigator.onLine) create.mutate(value);
            })}
            noValidate
          >
            {errors.length || create.isError ? (
              <div className="error-summary" role="alert">
                <strong>
                  <AlertCircle size={17} aria-hidden="true" /> لطفاً این موارد را بررسی کنید
                </strong>
                {create.isError ? (
                  <p>
                    {create.error instanceof ApiClientError
                      ? create.error.message
                      : 'درخواست ارسال نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.'}
                  </p>
                ) : null}
                {errors.length ? (
                  <ul>
                    {errors.map((error) => (
                      <li key={error.field}>
                        <button
                          className="form-error-link"
                          type="button"
                          onClick={() =>
                            form.setFocus(error.field as keyof PrescriptionCreateInput)
                          }
                        >
                          {error.message}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <FormSection
              number="۱"
              title="اطلاعات بیمار"
              description="اطلاعات را دقیق وارد کنید تا داروخانه بتواند نسخه شما را بررسی کند."
            >
              <Input
                label="شماره موبایل"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                dir="ltr"
                placeholder="0912 345 6789"
                required
                {...form.register('mobile')}
                error={form.formState.errors.mobile?.message}
              />
              <Input
                label="کد ملی"
                inputMode="numeric"
                autoComplete="off"
                dir="ltr"
                placeholder="۱۰ رقم کد ملی"
                maxLength={10}
                required
                {...form.register('nationalId')}
                error={form.formState.errors.nationalId?.message}
              />
              <Input
                label="کد رهگیری نسخه"
                className="full"
                placeholder="کدی که از پزشک یا سامانه نسخه الکترونیک گرفته‌اید"
                maxLength={50}
                hint="این کد با کد پیگیری درخواست که بعداً دریافت می‌کنید، متفاوت است."
                required
                {...form.register('prescriptionTrackingCode')}
                error={form.formState.errors.prescriptionTrackingCode?.message}
              />
            </FormSection>
            <FormSection
              number="۲"
              title="اطلاعات بیمه"
              description="بیمه پایه و در صورت داشتن، بیمه تکمیلی را مشخص کنید."
            >
              <div className="full">
                <Select
                  label="بیمه پایه"
                  required
                  disabled={base.isPending || base.isError}
                  {...form.register('baseInsuranceId')}
                  error={form.formState.errors.baseInsuranceId?.message}
                >
                  <option value="">
                    {base.isPending ? 'در حال دریافت بیمه‌ها…' : 'بیمه پایه خود را انتخاب کنید'}
                  </option>
                  {base.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
                {base.isError ? (
                  <div className="field-error" role="alert">
                    فهرست بیمه‌ها دریافت نشد.{' '}
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => void base.refetch()}
                    >
                      تلاش دوباره
                    </button>
                  </div>
                ) : null}
              </div>
              <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="field-label">بیمه تکمیلی دارید؟</legend>
                <div className="insurance-choice">
                  <label className="radio-card">
                    <input
                      name="supplementary-choice"
                      type="radio"
                      checked={!hasSupplementary}
                      onChange={() => changeInsurance(false)}
                    />
                    بیمه تکمیلی ندارم
                  </label>
                  <label className="radio-card">
                    <input
                      name="supplementary-choice"
                      type="radio"
                      checked={hasSupplementary}
                      onChange={() => changeInsurance(true)}
                    />
                    بیمه تکمیلی دارم
                  </label>
                </div>
              </fieldset>
              {hasSupplementary ? (
                <>
                  <Select
                    label="شرکت بیمه تکمیلی"
                    required
                    disabled={supplementary.isPending || supplementary.isError}
                    {...form.register('supplementaryInsuranceId')}
                    error={form.formState.errors.supplementaryInsuranceId?.message}
                  >
                    <option value="">
                      {supplementary.isPending ? 'در حال دریافت…' : 'شرکت بیمه را انتخاب کنید'}
                    </option>
                    {supplementary.data?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="توضیحات بیمه تکمیلی (اختیاری)"
                    maxLength={500}
                    placeholder="مثلاً بیمه گروهی محل کار"
                    {...form.register('supplementaryDescription')}
                    error={form.formState.errors.supplementaryDescription?.message}
                  />
                  {supplementary.isError ? (
                    <div className="field-error full" role="alert">
                      دریافت بیمه‌های تکمیلی ممکن نشد.{' '}
                      <button
                        className="link-button"
                        type="button"
                        onClick={() => void supplementary.refetch()}
                      >
                        تلاش دوباره
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </FormSection>
            <FormSection
              number="۳"
              title="توضیحات بیشتر"
              description="اگر نکته‌ای هست که داروخانه باید بداند، اینجا بنویسید."
            >
              <Textarea
                label="توضیحات بیمار (اختیاری)"
                className="full"
                maxLength={1000}
                rows={3}
                placeholder="مثلاً ترجیح می‌دهم همه اقلام نسخه از یک داروخانه تهیه شود."
                {...form.register('patientDescription')}
                error={form.formState.errors.patientDescription?.message}
              />
            </FormSection>
            <label className="honeypot" aria-hidden="true">
              نام شرکت
              <input tabIndex={-1} autoComplete="off" {...form.register('honeypot')} />
            </label>
            <div className="notice notice-icon">
              <ShieldCheck size={19} aria-hidden="true" />
              <p>
                با ثبت درخواست، اطلاعات نسخه برای بررسی امکان تأمین در اختیار داروخانه‌های تأییدشده
                قرار می‌گیرد. برای شما حساب کاربری ساخته نمی‌شود.
              </p>
            </div>
            <div className="form-actions sticky-actions">
              <span className="submit-caption">
                <LockKeyhole size={15} aria-hidden="true" />
                فقط برای بررسی و تأمین نسخه شما
              </span>
              <Button
                type="submit"
                loading={create.isPending}
                disabled={
                  base.isPending ||
                  base.isError ||
                  (hasSupplementary && (supplementary.isPending || supplementary.isError))
                }
              >
                ارسال درخواست نسخه
                <ArrowLeft size={18} aria-hidden="true" />
              </Button>
            </div>
          </form>
        </Card>
        <aside className="form-guide" aria-label="راهنمای ثبت نسخه">
          <img
            src="/images/landing/step-submit.webp"
            alt=""
            width="640"
            height="640"
            loading="lazy"
          />
          <h2>قبل از شروع، همراهتان باشد</h2>
          <ul className="guide-list">
            <li>
              <ClipboardList size={18} aria-hidden="true" />
              کد رهگیری نسخه پزشک
            </li>
            <li>
              <ShieldCheck size={18} aria-hidden="true" />
              اطلاعات بیمه پایه و تکمیلی
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              شماره موبایل و کد ملی بیمار
            </li>
          </ul>
          <div className="guide-footnote">
            <Clock3 size={17} aria-hidden="true" />
            <p>
              پس از ثبت، کد و لینک پیگیری می‌گیرید. پاسخ داروخانه‌ها را از همان لینک دنبال کنید.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
};
