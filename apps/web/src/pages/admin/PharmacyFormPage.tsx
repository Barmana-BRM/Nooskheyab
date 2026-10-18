import { ApiClientError } from '@pharmacy-mvp/api-client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button, Card, Input, Loading, PageTitle, Textarea } from '../../components/ui';

interface PharmacyDetails {
  name: string;
  technicalManager: string;
  technicalManagerIdentifier: string | null;
  pharmacyIdentifier: string | null;
  licenseNumber: string;
  licenseExpirationDate: string;
  mobile: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  workingHours: string;
}

interface PharmacyInput {
  name: string;
  technicalManager: string;
  technicalManagerIdentifier: string;
  pharmacyIdentifier: string;
  licenseNumber: string;
  licenseExpirationDate: string;
  mobile: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  workingHours: string;
}

const emptyValues: PharmacyInput = {
  name: '',
  technicalManager: '',
  technicalManagerIdentifier: '',
  pharmacyIdentifier: '',
  licenseNumber: '',
  licenseExpirationDate: '',
  mobile: '',
  phone: '',
  province: '',
  city: '',
  address: '',
  postalCode: '',
  workingHours: '',
};

const toInput = (data: PharmacyDetails): PharmacyInput => ({
  name: data.name,
  technicalManager: data.technicalManager,
  technicalManagerIdentifier: data.technicalManagerIdentifier ?? '',
  pharmacyIdentifier: data.pharmacyIdentifier ?? '',
  licenseNumber: data.licenseNumber,
  licenseExpirationDate: data.licenseExpirationDate.slice(0, 10),
  mobile: data.mobile,
  phone: data.phone,
  province: data.province,
  city: data.city,
  address: data.address,
  postalCode: data.postalCode,
  workingHours: data.workingHours,
});

export const PharmacyFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const form = useForm<PharmacyInput>({ defaultValues: emptyValues });
  const detail = useQuery({
    queryKey: ['admin', 'pharmacy', id],
    queryFn: () => api.request<PharmacyDetails>(`/admin/pharmacies/${id}`),
    enabled: isEdit,
  });
  useEffect(() => {
    if (detail.data) form.reset(toInput(detail.data));
  }, [detail.data, form]);

  const save = useMutation({
    mutationFn: (value: PharmacyInput) => {
      const body = JSON.stringify({
        ...value,
        technicalManagerIdentifier: value.technicalManagerIdentifier.trim() || undefined,
        pharmacyIdentifier: value.pharmacyIdentifier.trim() || undefined,
      });
      return api.request(isEdit ? `/admin/pharmacies/${id}` : '/admin/pharmacies', {
        method: isEdit ? 'PUT' : 'POST',
        body,
      });
    },
    onSuccess: () => navigate('/admin/pharmacies', { replace: true }),
  });

  if (isEdit && detail.isPending) return <Loading />;
  if (isEdit && detail.isError) return <p className="field-error">اطلاعات داروخانه دریافت نشد.</p>;
  const errorMessage =
    save.error instanceof ApiClientError
      ? save.error.message
      : save.error
        ? 'ذخیره اطلاعات انجام نشد.'
        : null;

  return (
    <main>
      <PageTitle
        title={isEdit ? 'ویرایش داروخانه' : 'افزودن داروخانه'}
        description="مشخصات، اطلاعات تماس و وضعیت فعالیت داروخانه را ثبت یا ویرایش کنید."
      />
      <Card>
        <form onSubmit={form.handleSubmit((value) => save.mutate(value))}>
          <div className="form-grid">
            <Input
              label="نام داروخانه"
              {...form.register('name', { required: 'نام داروخانه الزامی است.', minLength: 2 })}
              error={form.formState.errors.name?.message}
            />
            <Input
              label="مسئول فنی"
              {...form.register('technicalManager', {
                required: 'نام مسئول فنی الزامی است.',
                minLength: 2,
              })}
              error={form.formState.errors.technicalManager?.message}
            />
            <Input
              label="شناسه مسئول فنی (اختیاری)"
              {...form.register('technicalManagerIdentifier')}
            />
            <Input label="شناسه داروخانه (اختیاری)" {...form.register('pharmacyIdentifier')} />
            <Input
              label="شماره مجوز"
              {...form.register('licenseNumber', {
                required: 'شماره مجوز الزامی است.',
                minLength: 2,
              })}
              error={form.formState.errors.licenseNumber?.message}
            />
            <Input
              label="تاریخ اعتبار مجوز"
              type="date"
              {...form.register('licenseExpirationDate', {
                required: 'تاریخ اعتبار مجوز الزامی است.',
              })}
              error={form.formState.errors.licenseExpirationDate?.message}
            />
            <Input
              label="موبایل"
              inputMode="numeric"
              {...form.register('mobile', { required: 'موبایل الزامی است.' })}
              error={form.formState.errors.mobile?.message}
            />
            <Input
              label="تلفن ثابت"
              {...form.register('phone', { required: 'تلفن ثابت الزامی است.' })}
              error={form.formState.errors.phone?.message}
            />
            <Input
              label="استان"
              {...form.register('province', { required: 'استان الزامی است.', minLength: 2 })}
              error={form.formState.errors.province?.message}
            />
            <Input
              label="شهر"
              {...form.register('city', { required: 'شهر الزامی است.', minLength: 2 })}
              error={form.formState.errors.city?.message}
            />
            <Input
              label="کد پستی"
              inputMode="numeric"
              {...form.register('postalCode', { required: 'کد پستی الزامی است.' })}
              error={form.formState.errors.postalCode?.message}
            />
            <Input
              label="ساعت کاری"
              {...form.register('workingHours', {
                required: 'ساعت کاری الزامی است.',
                minLength: 2,
              })}
              error={form.formState.errors.workingHours?.message}
            />
            <Textarea
              label="نشانی"
              className="full"
              {...form.register('address', {
                required: 'نشانی الزامی است.',
                minLength: 5,
              })}
              error={form.formState.errors.address?.message}
            />
          </div>
          {errorMessage ? <p className="field-error">{errorMessage}</p> : null}
          <div className="form-actions">
            <Link className="link-button" to="/admin/pharmacies">
              انصراف
            </Link>
            <Button type="submit" loading={save.isPending}>
              {isEdit ? 'ذخیره تغییرات' : 'ایجاد داروخانه'}
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
};
