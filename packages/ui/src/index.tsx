import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

export const designTokens = {
  colors: {
    brand950: '#062D2B', brand900: '#0A3D3A', brand800: '#0D514C', brand700: '#0F6B63',
    brand600: '#13867C', brand500: '#1AA398', brand400: '#45BEB4', brand300: '#7BD5CD',
    brand100: '#DDF5F2', brand50: '#F1FBFA', navy900: '#102A43', navy700: '#243B53',
    background: '#F6F9F8', surface: '#FFFFFF', surfaceAlt: '#F0F5F4', border: '#DCE8E5',
    text: '#10211F', textMuted: '#64748B', info: '#0369A1', success: '#15803D',
    warning: '#B45309', error: '#B91C1C', disabled: '#94A3B8',
  },
  radius: { input: 12, card: 18, modal: 22 },
  motionMs: { fast: 150, normal: 200 },
} as const;

export type DesignTokens = typeof designTokens;

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }>(
  ({ loading, children, className = '', disabled, ...props }, ref) => (
    <button ref={ref} className={`btn btn-primary ${className}`} disabled={disabled || loading} {...props}>
      {loading ? 'در حال پردازش…' : children}
    </button>
  ),
);
Button.displayName = 'Button';

export const SecondaryButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, className = '', ...props }, ref) => <button ref={ref} className={`btn btn-secondary ${className}`} {...props}>{children}</button>,
);
SecondaryButton.displayName = 'SecondaryButton';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const inputId = id ?? props.name;
    return <label className="field" htmlFor={inputId}><span className="field-label">{label}</span><input ref={ref} id={inputId} className={`input ${error ? 'input-error' : ''} ${className}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} {...props} />{error ? <span id={`${inputId}-error`} className="field-error" role="alert">{error}</span> : null}</label>;
  },
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const textareaId = id ?? props.name;
    return <label className="field" htmlFor={textareaId}><span className="field-label">{label}</span><textarea ref={ref} id={textareaId} className={`input min-h-28 resize-y ${error ? 'input-error' : ''} ${className}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${textareaId}-error` : undefined} {...props} />{error ? <span id={`${textareaId}-error`} className="field-error" role="alert">{error}</span> : null}</label>;
  },
);
Textarea.displayName = 'Textarea';

export const Card = ({ children, className = '', ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) => <section className={`card ${className}`} {...props}>{children}</section>;
export const PageTitle = ({ title, description }: { title: string; description?: string }) => <div className="page-title"><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>;
export const Loading = () => <div className="state" role="status"><span className="spinner" />در حال دریافت اطلاعات…</div>;
export const Empty = ({ children = 'موردی برای نمایش وجود ندارد.' }: { children?: ReactNode }) => <div className="state">{children}</div>;
export const ErrorState = ({ onRetry }: { onRetry?: () => void }) => <div className="state state-error"><p>ارتباط با سامانه برقرار نشد.</p>{onRetry ? <SecondaryButton onClick={onRetry}>تلاش دوباره</SecondaryButton> : null}</div>;
export const StatusBadge = ({ status, label }: { status: string; label: string }) => <span className={`status-badge ${status.toLowerCase()} ${statusClassName(status)}`}><span aria-hidden="true">●</span>{label}</span>;
const statusClassName = (status: string): string => ({ ACCEPTED: 'success', FULL_AVAILABLE: 'success', COMPLETED: 'success', PARTIAL: 'warning', PARTIAL_AVAILABLE: 'warning', REJECTED: 'error', NOT_AVAILABLE: 'error', UNDER_REVIEW: 'info', SELECTED_PHARMACY: 'brand', APPROVED: 'success', EXPIRED: 'muted', CANCELLED: 'muted', SUSPENDED: 'error' }[status] ?? 'neutral');

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; children: ReactNode }>(
  ({ label, error, id, children, ...props }, ref) => { const selectId = id ?? props.name; return <label className="field" htmlFor={selectId}><span className="field-label">{label}</span><select ref={ref} id={selectId} className={`input ${error ? 'input-error' : ''}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${selectId}-error` : undefined} {...props}>{children}</select>{error ? <span id={`${selectId}-error`} className="field-error" role="alert">{error}</span> : null}</label>; },
);
Select.displayName = 'Select';
