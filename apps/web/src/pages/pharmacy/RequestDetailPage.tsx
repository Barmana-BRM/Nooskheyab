import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { pharmacyResponseSchema } from '@pharmacy-mvp/validation';
import { api } from '../../lib/api';
import { formatJalaliDateTime, remainingLabel } from '../../lib/date';
import { statusLabel } from '../../lib/status';
import { Button, Card, ErrorState, Loading, PageTitle, Select, StatusBadge, Textarea } from '../../components/ui';

type ResponseInput = z.infer<typeof pharmacyResponseSchema>;
interface Detail { id: string; publicId: string; status: string; prescriptionStatus: string; mobile: string; nationalId: string; prescriptionTrackingCode: string; baseInsurance: string; supplementaryInsurance: string | null; supplementaryDescription: string | null; patientDescription: string | null; expiresAt: string; response: { availabilityStatus: string; description: string | null } | null; selectedPharmacyId: string | null }

export const RequestDetailPage = () => {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['pharmacy', 'request', id], queryFn: () => api.request<Detail>(`/pharmacy/prescriptions/${encodeURIComponent(id)}`), enabled: Boolean(id) });
  const form = useForm<ResponseInput>({ resolver: zodResolver(pharmacyResponseSchema), defaultValues: { availabilityStatus: 'FULL_AVAILABLE', description: '' } });
  const response = useMutation({ mutationFn: (value: ResponseInput) => api.request(`/pharmacy/prescriptions/${encodeURIComponent(id)}/respond`, { method: 'POST', body: JSON.stringify(value) }), onSuccess: () => void query.refetch() });
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  const closed = ['EXPIRED', 'CANCELLED', 'COMPLETED', 'SELECTED_PHARMACY'].includes(data.prescriptionStatus) || data.status === 'CLOSED';
  return <><PageTitle title={`درخواست ${data.publicId}`} description={`ارسال‌شده در ${formatJalaliDateTime(new Date())}`} /><Card><dl className="detail-grid"><Item label="شماره موبایل" value={data.mobile} /><Item label="کد ملی" value={data.nationalId} /><Item label="کد رهگیری نسخه" value={data.prescriptionTrackingCode} /><Item label="بیمه پایه" value={data.baseInsurance} /><Item label="بیمه تکمیلی" value={data.supplementaryInsurance ?? 'ندارد'} /><Item label="زمان باقی‌مانده" value={closed ? statusLabel(data.prescriptionStatus) : remainingLabel(data.expiresAt)} /><Item label="توضیحات بیمار" value={data.patientDescription ?? '—'} /><Item label="توضیحات بیمه تکمیلی" value={data.supplementaryDescription ?? '—'} /></dl><div style={{ marginTop: '1rem' }}><StatusBadge status={data.prescriptionStatus} label={statusLabel(data.prescriptionStatus)} /></div>{!closed ? <form className="sticky-actions" onSubmit={form.handleSubmit((value) => response.mutate(value))}><Select label="نتیجه بررسی" {...form.register('availabilityStatus')} error={form.formState.errors.availabilityStatus?.message}><option value="FULL_AVAILABLE">نسخه کامل موجود است</option><option value="PARTIAL_AVAILABLE">بخشی از نسخه موجود است</option><option value="NOT_AVAILABLE">قابل تأمین نیست</option></Select><Textarea label="توضیح پاسخ" placeholder="برای پاسخ ناقص، اقلام قابل تأمین یا توضیح لازم را بنویسید." {...form.register('description')} error={form.formState.errors.description?.message} /><Button type="submit" loading={response.isPending}>ثبت پاسخ</Button></form> : null}</Card></>;
};
const Item = ({ label, value }: { label: string; value: string }) => <div className="detail-item"><dt>{label}</dt><dd>{value}</dd></div>;
