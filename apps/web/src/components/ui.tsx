import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  type HTMLAttributes,
} from 'react';

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }
>(({ loading, children, className = '', disabled, ...props }, ref) => (
  <button
    ref={ref}
    className={`btn btn-primary ${className}`}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? 'در حال پردازش…' : children}
  </button>
));
Button.displayName = 'Button';

export const SecondaryButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, className = '', ...props }, ref) => (
  <button ref={ref} className={`btn btn-secondary ${className}`} {...props}>
    {children}
  </button>
));
SecondaryButton.displayName = 'SecondaryButton';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }
>(({ label, error, id, className = '', ...props }, ref) => {
  const inputId = id ?? props.name;
  return (
    <label className="field" htmlFor={inputId}>
      <span className="field-label">{label}</span>
      <input
        ref={ref}
        id={inputId}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error ? (
        <span id={`${inputId}-error`} className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
});
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }
>(({ label, error, id, ...props }, ref) => {
  const textareaId = id ?? props.name;
  return (
    <label className="field" htmlFor={textareaId}>
      <span className="field-label">{label}</span>
      <textarea
        ref={ref}
        id={textareaId}
        className={`input min-h-28 resize-y ${error ? 'input-error' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...props}
      />
      {error ? (
        <span id={`${textareaId}-error`} className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
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
export const PageTitle = ({ title, description }: { title: string; description?: string }) => (
  <div className="page-title">
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
export const Empty = ({ children = 'موردی برای نمایش وجود ندارد.' }: { children?: ReactNode }) => (
  <div className="state">{children}</div>
);
export const ErrorState = ({ onRetry }: { onRetry?: () => void }) => (
  <div className="state state-error">
    <p>ارتباط با سامانه برقرار نشد.</p>
    {onRetry ? <SecondaryButton onClick={onRetry}>تلاش دوباره</SecondaryButton> : null}
  </div>
);
export const StatusBadge = ({ status, label }: { status: string; label: string }) => (
  <span className={`status-badge ${status.toLowerCase()} ${statusClassName(status)}`}>
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
  InputHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; children: ReactNode }
>(({ label, error, id, children, ...props }, ref) => {
  const selectId = id ?? props.name;
  return (
    <label className="field" htmlFor={selectId}>
      <span className="field-label">{label}</span>
      <select
        ref={ref}
        id={selectId}
        className={`input ${error ? 'input-error' : ''}`}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
});
Select.displayName = 'Select';
