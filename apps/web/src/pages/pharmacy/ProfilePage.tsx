import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '../../lib/api';
import { Button, Card, ErrorState, Input, Loading, PageTitle, Textarea } from '../../components/ui';

interface Profile { name: string; technicalManager: string; licenseNumber: string; licenseExpirationDate: string; mobile: string; phone: string; province: string; city: string; address: string; postalCode: string; workingHours: string; registrationStatus: string; documents: Array<{ id: string; originalName: string; documentType: string }> }
interface ProfileInput { pharmacyName: string; technicalManager: string; licenseNumber: string; licenseExpirationDate: string; mobile: string; phone: string; province: string; city: string; address: string; postalCode: string; workingHours: string }

export const ProfilePage = () => {
  const query = useQuery({ queryKey: ['pharmacy', 'profile'], queryFn: () => api.request<Profile>('/pharmacy/profile') });
  const form = useForm<ProfileInput>();
  const save = useMutation({ mutationFn: (value: ProfileInput) => api.request('/pharmacy/profile', { method: 'PUT', body: JSON.stringify(value) }), onSuccess: () => void query.refetch() });
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  return <><PageTitle title="پروفایل و مدارک" description="اطلاعات قابل ویرایش داروخانه را مدیریت کنید." /><Card><form onSubmit={form.handleSubmit((value) => save.mutate(value))}><div className="form-grid"><Input label="نام داروخانه" defaultValue={data.name} {...form.register('pharmacyName')} /><Input label="مسئول فنی" defaultValue={data.technicalManager} {...form.register('technicalManager')} /><Input label="شماره مجوز" defaultValue={data.licenseNumber} {...form.register('licenseNumber')} /><Input label="تاریخ اعتبار مجوز" type="date" defaultValue={data.licenseExpirationDate.slice(0, 10)} {...form.register('licenseExpirationDate')} /><Input label="موبایل" defaultValue={data.mobile} {...form.register('mobile')} /><Input label="تلفن ثابت" defaultValue={data.phone} {...form.register('phone')} /><Input label="استان" defaultValue={data.province} {...form.register('province')} /><Input label="شهر" defaultValue={data.city} {...form.register('city')} /><Input label="کد پستی" defaultValue={data.postalCode} {...form.register('postalCode')} /><Input label="ساعت کاری" defaultValue={data.workingHours} {...form.register('workingHours')} /><Textarea label="نشانی" className="full" defaultValue={data.address} {...form.register('address')} /></div><div className="form-actions"><span className="muted">وضعیت: {data.registrationStatus}</span><Button type="submit" loading={save.isPending}>ذخیره تغییرات</Button></div></form></Card></>;
};
