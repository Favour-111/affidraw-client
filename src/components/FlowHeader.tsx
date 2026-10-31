'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';

/** Header for full-screen flows (deposit, withdraw, PIN): back, centred title, close. */
export default function FlowHeader({ title, subtitle, onBack, closeHref = '/wallet' }: { title: string; subtitle?: React.ReactNode; onBack?: () => void; closeHref?: string }) {
  const router = useRouter();
  const btn = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink transition-colors hover:bg-surface-3';
  return (
    <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3">
      <button type="button" aria-label="Back" onClick={onBack ?? (() => (history.length > 1 ? router.back() : router.push(closeHref)))} className={btn}><ArrowLeft className="h-4.5 w-4.5" /></button>
      <div className="min-w-0 text-center">
        <h1 className="truncate text-heading font-bold">{title}</h1>
        {subtitle && <p className="tabular mt-0.5 truncate text-label text-muted">{subtitle}</p>}
      </div>
      <button type="button" aria-label="Close" onClick={() => router.push(closeHref)} className={btn}><X className="h-4.5 w-4.5" /></button>
    </div>
  );
}
