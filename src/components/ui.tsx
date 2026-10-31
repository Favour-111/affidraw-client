'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, Inbox, Loader2, X } from 'lucide-react';
import { STATUS_LABEL, pct } from '@/lib/format';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

/* ---------------------------------------------------------------- buttons */

type Variant = 'primary' | 'soft' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';
const BTN_BASE = 'inline-flex select-none items-center justify-center gap-2 rounded-[10px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed';
const BTN_SIZE: Record<Size, string> = { sm: 'h-9 px-3.5 text-label', md: 'h-11 px-4 text-body', lg: 'h-12 px-5 text-body' };
const BTN_VARIANT: Record<Variant, string> = {
  primary: 'bg-primary-strong text-white hover:bg-primary-strong-hover disabled:bg-primary-soft disabled:text-primary-text/60',
  soft: 'border border-primary-soft-border bg-primary-soft text-primary-text hover:bg-primary-soft-hover disabled:opacity-50',
  secondary: 'bg-surface-2 text-ink hover:bg-surface-3 disabled:opacity-50',
  outline: 'border border-line-strong bg-surface text-ink hover:bg-surface-2 disabled:opacity-50',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50',
  danger: 'border border-danger-border bg-danger-soft text-danger hover:brightness-[0.97] disabled:opacity-50',
};
export const buttonCls = (variant: Variant = 'primary', size: Size = 'md', full?: boolean) => cx(BTN_BASE, BTN_SIZE[size], BTN_VARIANT[variant], full && 'w-full');

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean; full?: boolean };
export function Button({ variant = 'primary', size = 'md', loading, full, className, children, disabled, ...p }: BtnProps) {
  return (
    <button {...p} disabled={disabled || loading} aria-busy={loading || undefined} className={cx(buttonCls(variant, size, full), className)}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ href, children, variant = 'primary', size = 'md', full, className }: { href: string; children: React.ReactNode; variant?: Variant; size?: Size; full?: boolean; className?: string }) {
  return <Link href={href} className={cx(buttonCls(variant, size, full), className)}>{children}</Link>;
}

/** Square, bordered icon button (Bayse-style header controls). */
export function IconButton({ label, children, href, onClick, round, className }: { label: string; children: React.ReactNode; href?: string; onClick?: () => void; round?: boolean; className?: string }) {
  const cls = cx('relative inline-flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-surface text-ink transition-colors hover:bg-surface-2', round ? 'rounded-full' : 'rounded-[10px]', className);
  return href ? <Link href={href} aria-label={label} className={cls}>{children}</Link> : <button type="button" aria-label={label} onClick={onClick} className={cls}>{children}</button>;
}

/* ---------------------------------------------------------------- surfaces */

export function Card({ className, children, as: As = 'div' }: { className?: string; children: React.ReactNode; as?: 'div' | 'section' | 'article' }) {
  return <As className={cx('rounded-2xl border border-line bg-surface', className)}>{children}</As>;
}

/** Collapsible card with a tinted header, like the reference's "Timeline & Payout". */
export function Disclosure({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 bg-surface-2 px-4 py-3.5 text-left text-body font-semibold text-ink">
        {title}
        <ChevronDown className={cx('h-4.5 w-4.5 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && <div className="fade-up px-4 py-4 text-body text-muted">{children}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- data display */

export function ProgressBar({ sold, capacity, label = true, size = 'md' }: { sold: number; capacity: number; label?: boolean; size?: 'sm' | 'md' }) {
  const p = pct(sold, capacity);
  return (
    <div>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={sold} aria-label={`${sold} of ${capacity} tickets sold`} className={cx('w-full overflow-hidden rounded-full bg-surface-3', size === 'sm' ? 'h-1.5' : 'h-2')}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${p}%` }} />
      </div>
      {label && (
        <p className="mt-2 flex justify-between text-meta text-muted">
          <span className="tabular">{sold.toLocaleString()} of {capacity.toLocaleString()} sold</span>
          <span className="tabular font-semibold text-ink">{p}%</span>
        </p>
      )}
    </div>
  );
}

const TONE: Record<string, string> = {
  OPEN: 'bg-primary-soft text-primary-text',
  COMPLETED: 'bg-primary-soft text-primary-text',
  SCHEDULED: 'bg-surface-2 text-muted',
  PAUSED: 'bg-warning-soft text-warning',
  SOLD_OUT: 'bg-warning-soft text-warning',
  AWAITING_DRAW: 'bg-warning-soft text-warning',
  RESULT_PENDING: 'bg-warning-soft text-warning',
  DRAW_IN_PROGRESS: 'bg-danger-soft text-danger',
  CANCELLED: 'bg-danger-soft text-danger',
  REJECTED: 'bg-danger-soft text-danger',
};
/** Always text + dot, never colour alone. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const live = status === 'DRAW_IN_PROGRESS';
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-meta font-semibold', TONE[status] ?? 'bg-surface-2 text-muted', className)}>
      <span className={cx('h-1.5 w-1.5 rounded-full bg-current', live && 'animate-pulse')} aria-hidden />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** Horizontal metadata row: icon + value pairs separated by space (reference: "49 Trades · ₦54.8k · Oct 29"). */
export function MetaRow({ items, className, spread }: { items: { icon: React.ComponentType<{ className?: string }>; label: React.ReactNode; title?: string }[]; className?: string; spread?: boolean }) {
  return (
    <ul className={cx('flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-muted', spread && 'justify-between', className)}>
      {items.map((it, i) => {
        const Icon = it.icon;
        return <li key={i} className="inline-flex items-center gap-1.5" title={it.title}><Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />{it.label}</li>;
      })}
    </ul>
  );
}

/** Vertical stepper. */
export function Timeline({ steps }: { steps: { title: string; detail?: React.ReactNode; state: 'done' | 'current' | 'upcoming' }[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex gap-3.5 pb-5 last:pb-0">
          {i < steps.length - 1 && <span aria-hidden className={cx('absolute left-[11px] top-7 h-[calc(100%-1.5rem)] w-px', s.state === 'done' ? 'bg-primary' : 'bg-line-strong')} />}
          <span aria-hidden className={cx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', s.state === 'done' ? 'bg-primary text-white' : s.state === 'current' ? 'border-2 border-primary bg-surface' : 'border-2 border-line-strong bg-surface')}>
            {s.state === 'done' && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            {s.state === 'current' && <span className="h-2 w-2 rounded-full bg-primary" />}
          </span>
          <div className="min-w-0">
            <p className={cx('text-label font-semibold', s.state === 'upcoming' ? 'text-muted' : 'text-ink')}>
              {s.title}<span className="sr-only"> — {s.state === 'done' ? 'completed' : s.state === 'current' ? 'in progress' : 'upcoming'}</span>
            </p>
            {s.detail && <p className="mt-0.5 text-meta text-muted">{s.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------------------------------------------- navigation */

/**
 * Text tabs over a thin track line, with a green indicator that slides to the selected tab.
 * Arrow keys move between tabs; the active tab scrolls into view on small screens.
 */
export function UnderlineTabs<T extends string>({ items, value, onChange, label, className }: { items: { id: T; label: React.ReactNode }[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const tabs = useRef<Map<T, HTMLButtonElement>>(new Map());
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const place = () => {
      const el = tabs.current.get(value);
      if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
    };
    place();
    const el = tabs.current.get(value);
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    const ro = new ResizeObserver(place);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [value, items]);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = items[(i + d + items.length) % items.length];
    onChange(next.id);
    tabs.current.get(next.id)?.focus();
  };

  return (
    <div ref={wrap} role="tablist" aria-label={label} className={cx('no-scrollbar relative -mx-4 flex gap-5 overflow-x-auto px-4 sm:mx-0 sm:gap-6 sm:px-0', className)}>
      {/* track line */}
      <span aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-px min-w-full bg-line" style={{ width: wrap.current?.scrollWidth }} />
      {items.map((it, i) => {
        const on = it.id === value;
        return (
          <button key={it.id} ref={(el) => { if (el) tabs.current.set(it.id, el); else tabs.current.delete(it.id); }}
            role="tab" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => onChange(it.id)} onKeyDown={(e) => onKey(e, i)}
            className={cx('relative shrink-0 whitespace-nowrap pb-2.5 pt-1 text-body font-semibold transition-colors duration-200 sm:pb-3', on ? 'text-ink' : 'text-muted hover:text-ink')}>
            {it.label}
          </button>
        );
      })}
      {/* sliding indicator */}
      {bar && (
        <span aria-hidden className="pointer-events-none absolute bottom-0 h-[3px] rounded-full bg-primary transition-[transform,width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ width: bar.width, transform: `translateX(${bar.left}px)`, left: 0 }} />
      )}
    </div>
  );
}

/** Compact filter chips (reference: For you / New / Closing soon). */
export function Chips<T extends string>({ items, value, onChange, label, className }: { items: { id: T; label: React.ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button key={it.id} role="radio" aria-checked={on} onClick={() => onChange(it.id)} className={cx('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-label font-semibold transition-colors sm:h-9 sm:px-3.5', on ? 'border-primary-strong bg-primary-strong text-white' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink')}>
            {it.label}
            {it.count !== undefined && <span className={cx('tabular font-medium', on ? 'text-white/80' : 'text-subtle')}>{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- feedback */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} aria-hidden />;
}

export function EmptyState({ title, text, action, icon: Icon = Inbox }: { title: string; text?: string; action?: React.ReactNode; icon?: React.ComponentType<{ className?: string; strokeWidth?: number }> }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <Icon className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      <p className="mt-4 text-heading font-bold text-ink">{title}</p>
      {text && <p className="mt-1.5 max-w-sm text-body text-muted">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-14 text-center">
      <AlertCircle className="h-9 w-9 text-danger" strokeWidth={1.75} aria-hidden />
      <p className="mt-4 text-heading font-bold text-ink">Couldn’t load this</p>
      <p className="mt-1.5 max-w-sm text-body text-muted">{message ?? 'Please check your connection and try again.'}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-6" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Alert({ tone = 'info', title, children }: { tone?: 'info' | 'error' | 'warning' | 'success'; title?: string; children: React.ReactNode }) {
  const t = {
    info: 'border-line bg-surface-2 text-fg',
    error: 'border-danger-border bg-danger-soft text-danger',
    warning: 'border-warning-border bg-warning-soft text-warning',
    success: 'border-primary-soft-border bg-primary-soft text-primary-text',
  }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-xl border px-4 py-3 text-label', t)}>
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- forms */

export function Field({ label, error, hint, required, action, children }: { label: string; error?: string; hint?: string; required?: boolean; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-2">
        <span className="text-label font-semibold text-ink">{label}{required && <span className="text-primary" aria-hidden> *</span>}</span>
        {action}
      </span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-meta text-muted">{hint}</span>}
      {error && <span role="alert" className="mt-1.5 block text-meta font-medium text-danger">{error}</span>}
    </label>
  );
}
export const inputCls = 'h-11 w-full rounded-[10px] border border-line-strong bg-surface px-3.5 text-body text-ink outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/15 disabled:bg-surface-2 disabled:text-muted';
export const textareaCls = 'w-full rounded-[10px] border border-line-strong bg-surface px-3.5 py-2.5 text-body text-ink outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/15 disabled:bg-surface-2 disabled:text-muted';

/* ---------------------------------------------------------------- overlays */

/** Bottom sheet on mobile, centered dialog from sm up. Escape and backdrop close; focus moves in and is restored. */
export function Sheet({ open, onClose, title, children, labelledBy = 'sheet-title' }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('[autofocus], input, textarea, select, button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && el) {
        const f = el.querySelectorAll<HTMLElement>('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const [a, z] = [f[0], f[f.length - 1]];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="overlay absolute inset-0 bg-[var(--overlay)]" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={title ? labelledBy : undefined} className="sheet safe-bottom relative w-full max-w-md rounded-t-3xl bg-surface p-5 pt-3 sm:rounded-2xl sm:pt-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          {title && <h2 id={labelledBy} className="text-heading font-bold">{title}</h2>}
          <button onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 hidden h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 sm:flex"><X className="h-4.5 w-4.5" /></button>
        </div>
        <div className={title ? 'mt-3' : ''}>{children}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- page scaffolding */

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-display font-bold">{title}</h1>
        {sub && <p className="mt-1 text-body text-muted">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Uppercase micro label (reference: "CHANCE"). */
export const Micro = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cx('text-micro font-semibold uppercase text-muted', className)}>{children}</span>
);
