import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { PatientPrescriptionSummary, PharmacyResponseView } from '@pharmacy-mvp/types';
import { api } from '../../lib/api';
import { formatJalaliDateTime, remainingLabel } from '../../lib/date';
import { readPatientToken, writePatientToken } from '../../lib/patient-token';
import { sortPharmacyResponses, statusLabel } from '../../lib/status';
import { Button, Card, Dialog, Empty, ErrorState, Loading, StatusBadge } from '../../components/ui';

export const StatusPage = () => {
  const { publicId = '' } = useParams();
  const location = useLocation();
  const accessKey = useId();
  const [accessVersion, setAccessVersion] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [resolvingToken, setResolvingToken] = useState(true);
  const [selected, setSelected] = useState<PharmacyResponseView | null>(null);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'complete' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const queryToken = new URLSearchParams(location.search).get('token');
    if (queryToken)
      window.history.replaceState({}, document.title, '/request/' + encodeURIComponent(publicId));
    let disposed = false;
    setResolvingToken(true);
    void (async () => {
      try {
        const accessToken = queryToken ?? (await readPatientToken(publicId));
        if (disposed) return;
        setToken(accessToken);
        if (queryToken) await writePatientToken(publicId, queryToken);
      } catch {
        if (!disposed) setToken(queryToken);
      } finally {
        if (!disposed) {
          setAccessVersion((version) => version + 1);
          setResolvingToken(false);
        }
      }
    })();
    return () => {
      disposed = true;
    };
  }, [location.search, publicId]);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);
  const query = useQuery({
    queryKey: ['patient-prescription', publicId, accessKey, accessVersion],
    gcTime: 0,
    queryFn: () =>
      api.request<PatientPrescriptionSummary>('/prescriptions/' + encodeURIComponent(publicId), {
        headers: { 'X-Prescription-Token': token ?? '' },
      }),
    enabled: Boolean(publicId && token) && !resolvingToken,
    refetchInterval: (current) =>
      document.visibilityState === 'visible' &&
      navigator.onLine &&
      current.state.data &&
      !['CANCELLED', 'COMPLETED', 'EXPIRED', 'SELECTED_PHARMACY'].includes(
        current.state.data.status,
      )
        ? 30_000
        : false,
    refetchIntervalInBackground: false,
  });
  const refresh = () => {
    setNow(Date.now());
    void query.refetch();
  };
  const select = useMutation({
    mutationFn: (pharmacyId: string) =>
      api.request('/prescriptions/' + encodeURIComponent(publicId) + '/select-pharmacy', {
        method: 'POST',
        headers: { 'X-Prescription-Token': token ?? '' },
        body: JSON.stringify({ pharmacyId }),
      }),
    onSuccess: () => {
      setActionError(null);
      setSelected(null);
      refresh();
    },
    onError: (error) => {
      setSelected(null);
      setActionError(
        error instanceof Error ? error.message : 'انتخاب داروخانه انجام نشد. دوباره تلاش کنید.',
      );
      refresh();
    },
  });
  const action = useMutation({
    mutationFn: (kind: 'cancel' | 'complete') =>
      api.request('/prescriptions/' + encodeURIComponent(publicId) + '/' + kind, {
        method: 'POST',
        headers: { 'X-Prescription-Token': token ?? '' },
      }),
    onSuccess: () => {
      setActionError(null);
      setConfirmAction(null);
      refresh();
    },
    onError: (error) => {
      setConfirmAction(null);
      setActionError(
        error instanceof Error ? error.message : 'عملیات انجام نشد. دوباره تلاش کنید.',
      );
    },
  });
  if (resolvingToken)
    return (
      <main className="status-page" id="main-content">
        <Loading />
      </main>
    );
  if (!token)
    return (
      <main className="status-page" id="main-content">
        <Card>
          <h1>پیگیری درخواست</h1>
          <Empty>برای دیدن این درخواست به لینک خصوصی آن نیاز دارید.</Empty>
          <div className="button-row">
            <Link className="btn btn-primary" to="/request/track">
              ورود لینک پیگیری
              <ArrowLeft size={17} aria-hidden="true" />
            </Link>
            <Link className="btn btn-secondary" to="/request">
              ثبت درخواست جدید
            </Link>
          </div>
        </Card>
      </main>
    );
  if (query.isPending)
    return (
      <main className="status-page" id="main-content">
        <Loading />
      </main>
    );
  if (query.isError || !query.data)
    return (
      <main className="status-page" id="main-content">
        <Card>
          <h1>دریافت وضعیت ممکن نشد</h1>
          <ErrorState onRetry={refresh} />
          <p className="muted">لینک خصوصی درخواست را بررسی کنید و دوباره تلاش کنید.</p>
          <Link className="text-link" to="/request/track">
            بازگشت به پیگیری درخواست
            <ArrowLeft size={17} aria-hidden="true" />
          </Link>
        </Card>
      </main>
    );
  const data = query.data;
  const expired =
    !data.selectedPharmacyId &&
    !['CANCELLED', 'COMPLETED'].includes(data.status) &&
    new Date(data.expiresAt).getTime() <= now;
  const status = expired ? 'EXPIRED' : data.status;
  const isClosed = ['EXPIRED', 'CANCELLED', 'COMPLETED', 'SELECTED_PHARMACY'].includes(status);
  const responses = sortPharmacyResponses(data.responses);
  const milestones = [
    { label: 'ثبت درخواست', done: true },
    {
      label: 'بررسی داروخانه‌ها',
      done:
        data.respondedCount > 0 || status === 'UNDER_REVIEW' || Boolean(data.selectedPharmacyId),
    },
    { label: 'دریافت نتیجه', done: data.respondedCount > 0 },
    { label: 'انتخاب داروخانه', done: Boolean(data.selectedPharmacyId) },
  ];
  return (
    <main className="status-page" id="main-content">
      <div className="status-header">
        <div>
          <span className="section-kicker">نسخه‌تان را از همین‌جا دنبال کنید</span>
          <h1>
            پیگیری درخواست <bdi>{data.publicId}</bdi>
          </h1>
          <p className="muted">
            آخرین به‌روزرسانی: {formatJalaliDateTime(new Date(query.dataUpdatedAt))}
          </p>
        </div>
        <Button className="btn-secondary" loading={query.isFetching} onClick={refresh}>
          <RefreshCw size={16} aria-hidden="true" />
          به‌روزرسانی
        </Button>
      </div>
      <Card className="status-summary">
        <div className="status-summary-heading">
          <StatusBadge status={status} label={statusLabel(status)} />
          <span>
            <Clock3 size={15} aria-hidden="true" />{' '}
            {isClosed ? statusLabel(status) : 'زمان باقی‌مانده: ' + remainingLabel(data.expiresAt)}
          </span>
        </div>
        <ol className="timeline" aria-label="مراحل درخواست">
          {milestones.map((milestone, index) => (
            <li key={milestone.label} className={'timeline-item' + (milestone.done ? ' done' : '')}>
              <span className="timeline-marker" aria-hidden="true">
                {milestone.done ? <Check size={16} /> : (index + 1).toLocaleString('fa-IR')}
              </span>
              <span>{milestone.label}</span>
            </li>
          ))}
        </ol>
        <div className="status-counts">
          <span>
            <strong>{data.respondedCount.toLocaleString('fa-IR')}</strong> پاسخ از{' '}
            {data.pharmaciesCount.toLocaleString('fa-IR')} داروخانه
          </span>
          {!isClosed ? (
            <button
              className="request-cancel-button"
              type="button"
              onClick={() => setConfirmAction('cancel')}
            >
              لغو درخواست
            </button>
          ) : null}
        </div>
      </Card>
      {actionError ? (
        <div className="error-summary" role="alert">
          {actionError}
        </div>
      ) : null}
      {status === 'EXPIRED' ? (
        <div className="notice form-status-notice">
          <p>
            مهلت بررسی این درخواست تمام شده است. برای دریافت پاسخ‌های تازه، درخواست جدید ثبت کنید.
          </p>
          <Link className="text-link" to="/request">
            ثبت درخواست جدید
            <ArrowLeft size={17} aria-hidden="true" />
          </Link>
        </div>
      ) : null}
      {status === 'SELECTED_PHARMACY' ? (
        <div className="alert alert-success" role="status">
          <CheckCircle2 size={18} aria-hidden="true" /> داروخانه شما انتخاب شد. نشانی و ساعت کاری آن
          را پیش از مراجعه بررسی کنید.
        </div>
      ) : null}
      {status === 'COMPLETED' ? (
        <div className="alert alert-success" role="status">
          <CheckCircle2 size={18} aria-hidden="true" /> دریافت نسخه تکمیل شد. برایتان آرزوی سلامتی
          داریم.
        </div>
      ) : null}
      <div className="response-section-heading">
        <h2>پاسخ داروخانه‌ها</h2>
        <span className="muted">ابتدا پاسخ‌های موجودی کامل نمایش داده می‌شوند.</span>
      </div>
      <div className="response-grid">
        {responses.length ? (
          responses.map((response) => (
            <ResponseCard
              key={response.id}
              response={response}
              selected={data.selectedPharmacyId === response.pharmacyId}
              onSelect={() => setSelected(response)}
              disabled={!response.isSelectable || isClosed || select.isPending}
            />
          ))
        ) : (
          <Card className="full">
            <Empty>
              {data.pharmaciesCount
                ? 'هنوز پاسخی ثبت نشده است. به محض بررسی، پاسخ داروخانه‌ها اینجا نمایش داده می‌شود.'
                : 'هنوز داروخانه‌ای برای بررسی این درخواست تعیین نشده است.'}
            </Empty>
          </Card>
        )}
      </div>
      {status === 'SELECTED_PHARMACY' ? (
        <Card className="form-actions">
          <span className="muted">بعد از مراجعه و دریافت نسخه، درخواست را تکمیل کنید.</span>
          <Button onClick={() => setConfirmAction('complete')}>
            نسخه را دریافت کردم
            <CheckCircle2 size={17} aria-hidden="true" />
          </Button>
        </Card>
      ) : null}
      <p className="auth-security">
        <ShieldCheck size={16} aria-hidden="true" />
        این صفحه خصوصی است؛ لینک آن را فقط نزد خود نگه دارید.
      </p>
      <Dialog
        open={Boolean(selected)}
        title="انتخاب داروخانه"
        onClose={() => {
          if (!select.isPending) setSelected(null);
        }}
      >
        {selected ? (
          <>
            <p>
              با انتخاب «{selected.pharmacyName}»، پاسخ سایر داروخانه‌ها بسته می‌شود. انتخابتان را
              تأیید می‌کنید؟
            </p>
            <div className="detail-item">
              <strong>{selected.pharmacyName}</strong>
              <p className="muted">
                {selected.city}، {selected.address}
              </p>
            </div>
            <div className="button-row">
              <Button onClick={() => select.mutate(selected.pharmacyId)} loading={select.isPending}>
                تأیید انتخاب
              </Button>
              <Button
                className="btn-secondary"
                disabled={select.isPending}
                onClick={() => setSelected(null)}
              >
                بازگشت
              </Button>
            </div>
          </>
        ) : null}
      </Dialog>
      <Dialog
        open={Boolean(confirmAction)}
        title={confirmAction === 'cancel' ? 'لغو درخواست نسخه' : 'ثبت دریافت نسخه'}
        onClose={() => {
          if (!action.isPending) setConfirmAction(null);
        }}
      >
        <p>
          {confirmAction === 'cancel'
            ? 'با لغو درخواست، بررسی داروخانه‌ها متوقف می‌شود. از لغو مطمئنید؟'
            : 'نسخه را از داروخانه منتخب دریافت کرده‌اید؟ با تأیید، این درخواست تکمیل می‌شود.'}
        </p>
        <div className="button-row">
          <Button
            className={confirmAction === 'cancel' ? 'btn-danger' : ''}
            loading={action.isPending}
            onClick={() => {
              if (confirmAction) action.mutate(confirmAction);
            }}
          >
            {confirmAction === 'cancel' ? 'بله، لغو شود' : 'بله، دریافت کردم'}
          </Button>
          <Button
            className="btn-secondary"
            disabled={action.isPending}
            onClick={() => setConfirmAction(null)}
          >
            بازگشت
          </Button>
        </div>
      </Dialog>
    </main>
  );
};

const ResponseCard = ({
  response,
  onSelect,
  disabled,
  selected,
}: {
  response: PharmacyResponseView;
  onSelect: () => void;
  disabled: boolean;
  selected: boolean;
}) => (
  <Card className={'response-card' + (selected ? ' selected' : '')}>
    <div className="response-top">
      <div className="response-pharmacy-title">
        <span className="soft-icon">
          <Building2 size={19} aria-hidden="true" />
        </span>
        <h3>{response.pharmacyName}</h3>
      </div>
      <StatusBadge
        status={selected ? 'SELECTED_PHARMACY' : response.availabilityStatus}
        label={selected ? 'داروخانه منتخب شما' : statusLabel(response.availabilityStatus)}
      />
    </div>
    <div className="response-meta">
      <span>
        <MapPin size={16} aria-hidden="true" />
        {response.city}، {response.address}
      </span>
      <span>
        <Clock3 size={16} aria-hidden="true" />
        ساعت کاری: {response.workingHours}
      </span>
      <span>زمان پاسخ: {formatJalaliDateTime(response.respondedAt)}</span>
    </div>
    {response.description ? <p className="response-description">{response.description}</p> : null}
    {response.availabilityStatus !== 'NOT_AVAILABLE' && !selected ? (
      <Button disabled={disabled} onClick={onSelect}>
        انتخاب این داروخانه
        <ArrowLeft size={17} aria-hidden="true" />
      </Button>
    ) : null}
  </Card>
);
