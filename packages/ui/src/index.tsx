import {
  forwardRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
  useRef,
} from 'react';

export const designTokens = {
  colors: {
    brand950: '#062D2B',
    brand900: '#0A3D3A',
    brand800: '#0D514C',
    brand700: '#0F6B63',
    brand600: '#13867C',
    brand500: '#1AA398',
    brand400: '#45BEB4',
    brand300: '#7BD5CD',
    brand100: '#DDF5F2',
    brand50: '#F1FBFA',
    navy900: '#102A43',
    navy700: '#243B53',
    background: '#F6F9F8',
    surface: '#FFFFFF',
    surfaceAlt: '#F0F5F4',
    border: '#DCE8E5',
    text: '#10211F',
    textMuted: '#64748B',
    info: '#0369A1',
    success: '#15803D',
    warning: '#B45309',
    error: '#B91C1C',
    disabled: '#94A3B8',
  },
  radius: { input: 12, card: 18, modal: 22 },
  motionMs: { fast: 150, normal: 200 },
} as const;

export type DesignTokens = typeof designTokens;

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }
>(({ loading, children, className = '', disabled, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    className={`btn btn-primary ${className}`}
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...props}
  >
    {loading ? (
      <>
        <span className="spinner button-spinner" aria-hidden="true" />
        در حال انجام…
      </>
    ) : (
      children
    )}
  </button>
));
Button.displayName = 'Button';

export const SecondaryButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, className = '', type = 'button', ...props }, ref) => (
  <button ref={ref} className={`btn btn-secondary ${className}`} type={type} {...props}>
    {children}
  </button>
));
SecondaryButton.displayName = 'SecondaryButton';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }
>(({ label, error, hint, id, className = '', ...props }, ref) => {
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;
  return (
    <div className={`field ${className.split(' ').includes('full') ? 'full' : ''}`}>
      <div className="field-label">
        <label htmlFor={inputId}>{label}</label>
        {props.required ? (
          <span className="required-mark" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </div>
      <input
        ref={ref}
        id={inputId}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {!error && hint ? (
        <span id={`${inputId}-hint`} className="field-hint">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${inputId}-error`} className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
});
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string }
>(({ label, error, hint, id, className = '', ...props }, ref) => {
  const generatedId = useId();
  const textareaId = id ?? props.name ?? generatedId;
  return (
    <div className={`field ${className.split(' ').includes('full') ? 'full' : ''}`}>
      <label className="field-label" htmlFor={textareaId}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={textareaId}
        className={`input min-h-28 resize-y ${error ? 'input-error' : ''} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
        {...props}
      />
      {!error && hint ? (
        <span id={`${textareaId}-hint`} className="field-hint">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${textareaId}-error`} className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
});
Textarea.displayName = 'Textarea';

export const Card = ({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) => (
  <section className={`card ${className}`} {...props}>
    {children}
  </section>
);
export const PageTitle = ({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
}) => (
  <div className="page-title">
    {eyebrow ? <span className="section-kicker">{eyebrow}</span> : null}
    <h1>{title}</h1>
    {description ? <p>{description}</p> : null}
  </div>
);
export const Loading = () => (
  <div className="state" role="status">
    <span className="spinner" />
    در حال دریافت اطلاعات…
  </div>
);
export const Empty = ({
  children = 'هنوز موردی برای نمایش وجود ندارد.',
}: {
  children?: ReactNode;
}) => (
  <div className="state empty-state">
    <span className="state-illustration" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        <path
          d="M15 10h18a4 4 0 0 1 4 4v25H11V14a4 4 0 0 1 4-4Z"
          fill="currentColor"
          opacity=".12"
        />
        <path
          d="M17 6h14v8H17zM16 24h16M16 31h10M11 16v23h26V16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
    <p>{children}</p>
  </div>
);
export const ErrorState = ({ onRetry }: { onRetry?: () => void }) => (
  <div className="state state-error">
    <p>ارتباط با سامانه برقرار نشد.</p>
    {onRetry ? <SecondaryButton onClick={onRetry}>تلاش دوباره</SecondaryButton> : null}
  </div>
);
export const StatusBadge = ({ status, label }: { status: string; label: string }) => (
  <span className={`status-badge ${status.toLowerCase()} status-${statusClassName(status)}`}>
    <span aria-hidden="true">●</span>
    {label}
  </span>
);
const statusClassName = (status: string): string =>
  ({
    ACCEPTED: 'success',
    FULL_AVAILABLE: 'success',
    COMPLETED: 'success',
    PARTIAL: 'warning',
    PARTIAL_AVAILABLE: 'warning',
    REJECTED: 'error',
    NOT_AVAILABLE: 'error',
    UNDER_REVIEW: 'info',
    SELECTED_PHARMACY: 'brand',
    APPROVED: 'success',
    EXPIRED: 'muted',
    CANCELLED: 'muted',
    SUSPENDED: 'error',
  })[status] ?? 'neutral';

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & {
    label: string;
    error?: string;
    hint?: string;
    children: ReactNode;
  }
>(({ label, error, hint, id, children, ...props }, ref) => {
  const generatedId = useId();
  const selectId = id ?? props.name ?? generatedId;
  return (
    <div className="field">
      <div className="field-label">
        <label htmlFor={selectId}>{label}</label>
        {props.required ? (
          <span className="required-mark" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </div>
      <select
        ref={ref}
        id={selectId}
        className={`input ${error ? 'input-error' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
        {...props}
      >
        {children}
      </select>
      {!error && hint ? (
        <span id={`${selectId}-hint`} className="field-hint">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${selectId}-error`} className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
});
Select.displayName = 'Select';

export const Combobox = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    options?: Array<{ value: string; label: string }>;
  }
>(({ label, error, options = [], id, ...props }, ref) => {
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;
  const listId = `${inputId}-options`;
  return (
    <label className="field" htmlFor={inputId}>
      <span className="field-label">{label}</span>
      <input
        ref={ref}
        id={inputId}
        className={`input ${error ? 'input-error' : ''}`}
        list={listId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </datalist>
      {error ? (
        <span id={`${inputId}-error`} className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
});
Combobox.displayName = 'Combobox';

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
>(({ label, className = '', ...props }, ref) => (
  <button ref={ref} className={`icon-button ${className}`} aria-label={label} {...props} />
));
IconButton.displayName = 'IconButton';

export const LoadingButton = Button;

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
    label: string;
    error?: string;
    hint?: string;
  }
>(({ label, error, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <div className="password-field">
        <Input
          ref={ref}
          label={label}
          error={error}
          type={visible ? 'text' : 'password'}
          {...props}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
          aria-pressed={visible}
        >
          {visible ? 'پنهان' : 'نمایش'}
        </button>
      </div>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

export const Checkbox = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string }
>(({ label, ...props }, ref) => (
  <label className="checkbox-field">
    <input ref={ref} type="checkbox" {...props} />
    <span>{label}</span>
  </label>
));
Checkbox.displayName = 'Checkbox';

export const RadioGroup = ({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) => (
  <div className="radio-row" role="radiogroup">
    {options.map((option) => (
      <label className="radio-card" key={option.value}>
        <input
          type="radio"
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
        />
        {option.label}
      </label>
    ))}
  </div>
);

export const FormError = ({ children }: { children?: ReactNode }) =>
  children ? (
    <p className="field-error" role="alert">
      {children}
    </p>
  ) : null;
export const FormField = ({
  label,
  error,
  children,
}: {
  label?: string;
  error?: ReactNode;
  children: ReactNode;
}) => (
  <div className="field">
    {label ? <span className="field-label">{label}</span> : null}
    {children}
    {error ? (
      <span className="field-error" role="alert">
        {error}
      </span>
    ) : null}
  </div>
);
export const Alert = ({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'error';
}) => (
  <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    {children}
  </div>
);
export const Toast = Alert;

export const StatCard = ({
  title,
  value,
  icon,
  caption,
  tone = 'brand',
}: {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  caption?: string;
  tone?: 'brand' | 'blue' | 'amber' | 'rose';
}) => (
  <div className={`stat-card stat-${tone}`}>
    <div className="stat-card-heading">
      <span>{title}</span>
      {icon ? (
        <span className="stat-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
    </div>
    <strong>{value}</strong>
    {caption ? <small>{caption}</small> : null}
  </div>
);

export const FormSection = ({
  title,
  description,
  number,
  children,
}: {
  title: string;
  description?: string;
  number?: string;
  children: ReactNode;
}) => (
  <fieldset className="form-section">
    <legend className="form-section-title">
      {number ? (
        <span className="form-section-number" aria-hidden="true">
          {number}
        </span>
      ) : null}
      {title}
    </legend>
    {description ? <p className="form-section-description">{description}</p> : null}
    <div className="form-grid">{children}</div>
  </fieldset>
);
export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`skeleton ${className}`} aria-hidden="true" />
);
export const OfflineState = ({ onRetry }: { onRetry?: () => void }) => (
  <div className="state state-error">
    <p>اتصال اینترنت برقرار نیست.</p>
    {onRetry ? <SecondaryButton onClick={onRetry}>تلاش دوباره</SecondaryButton> : null}
  </div>
);

export const Dialog = ({
  open,
  title,
  children,
  onClose,
  className = '',
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    (focusable()[0] ?? dialogRef.current)?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`dialog ${className}`}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="dialog-heading">
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button dialog-close"
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'تأیید',
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) => (
  <Dialog open={open} title={title} onClose={onClose}>
    <p>{message}</p>
    <div className="button-row">
      <SecondaryButton onClick={onClose}>انصراف</SecondaryButton>
      <Button onClick={onConfirm}>{confirmLabel}</Button>
    </div>
  </Dialog>
);
export const BottomSheet = Dialog;
export const Drawer = Dialog;

export const Table = ({ children }: { children: ReactNode }) => (
  <div className="table-wrap">
    <table className="data-table">{children}</table>
  </div>
);
export const ResponsiveList = ({ children }: { children: ReactNode }) => (
  <div className="mobile-row-list">{children}</div>
);
export const Pagination = ({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) => (
  <div className="button-row" aria-label="صفحه‌بندی">
    <SecondaryButton disabled={page <= 1} onClick={() => onChange(page - 1)}>
      قبلی
    </SecondaryButton>
    <span className="muted">
      صفحه {page} از {pages}
    </span>
    <SecondaryButton disabled={page >= pages} onClick={() => onChange(page + 1)}>
      بعدی
    </SecondaryButton>
  </div>
);
export const SearchInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label?: string }
>(({ label = 'جست‌وجو', ...props }, ref) => (
  <Input ref={ref} type="search" label={label} {...props} />
));
SearchInput.displayName = 'SearchInput';
export const FilterBar = ({ children }: { children: ReactNode }) => (
  <div className="toolbar">{children}</div>
);

export const FileUploader = ({
  onSelect,
  accept,
  disabled = false,
}: {
  onSelect: (file: File) => void;
  accept?: string;
  disabled?: boolean;
}) => (
  <label className={`btn btn-secondary ${disabled ? 'disabled' : ''}`}>
    انتخاب فایل
    <input
      type="file"
      hidden
      accept={accept}
      disabled={disabled}
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) onSelect(file);
        event.currentTarget.value = '';
      }}
    />
  </label>
);
export const FilePreview = ({ name, onRemove }: { name: string; onRemove?: () => void }) => (
  <div className="mobile-row">
    <span>{name}</span>
    {onRemove ? <SecondaryButton onClick={onRemove}>حذف</SecondaryButton> : null}
  </div>
);

export const DateDisplay = ({ value }: { value: string | Date }) => (
  <time dateTime={new Date(value).toISOString()}>
    {new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Tehran',
    }).format(new Date(value))}
  </time>
);
export const JalaliDatePicker = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }
>((props, ref) => <Input ref={ref} type="date" {...props} />);
JalaliDatePicker.displayName = 'JalaliDatePicker';
export const PageHeader = PageTitle;
export const AppHeader = ({ children }: { children: ReactNode }) => (
  <header className="site-header">{children}</header>
);
export const Sidebar = ({ children }: { children: ReactNode }) => (
  <aside className="portal-sidebar">{children}</aside>
);
export const MobileNavigation = ({ children }: { children: ReactNode }) => (
  <nav className="mobile-navigation">{children}</nav>
);
export const CopyButton = ({ value, label = 'کپی' }: { value: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <SecondaryButton
      type="button"
      onClick={() => {
        if (!navigator.clipboard) return;
        void navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => undefined);
      }}
    >
      {copied ? 'کپی شد' : label}
    </SecondaryButton>
  );
};
