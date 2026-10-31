'use client';
import { useEffect } from 'react';
import { Delete } from 'lucide-react';
import { cx } from './ui';

export type Key = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'del';

/** On-screen numeric keypad (reference style). Also listens to the physical keyboard. */
export default function Keypad({ onKey, decimal = false, disabled, className, onEnter }: { onKey: (k: Key) => void; decimal?: boolean; disabled?: boolean; className?: string; onEnter?: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (disabled || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (/^\d$/.test(e.key)) onKey(e.key as Key);
      else if (e.key === 'Backspace') onKey('del');
      else if (decimal && e.key === '.') onKey('.');
      else if (e.key === 'Enter' && onEnter) onEnter();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onKey, decimal, disabled, onEnter]);

  const keys: (Key | null)[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', decimal ? '.' : null, '0', 'del'];
  return (
    <div className={cx('mx-auto grid w-full max-w-sm grid-cols-3 gap-y-1', className)}>
      {keys.map((k, i) =>
        k === null ? <span key={i} /> : (
          <button key={i} type="button" disabled={disabled} onClick={() => onKey(k)} aria-label={k === 'del' ? 'Delete' : k === '.' ? 'Decimal point' : k}
            className="flex h-16 items-center justify-center rounded-2xl text-[1.375rem] font-bold text-ink transition-colors active:bg-surface-2 hover:bg-surface-2 disabled:opacity-40">
            {k === 'del' ? <Delete className="h-6 w-6" strokeWidth={2} /> : k}
          </button>
        ),
      )}
    </div>
  );
}

/** Applies a key to a naira amount string, allowing at most two decimal places. */
export function applyAmountKey(value: string, k: Key, maxDigits = 7) {
  if (k === 'del') return value.slice(0, -1);
  if (k === '.') return value.includes('.') ? value : (value || '0') + '.';
  const [whole, frac] = value.split('.');
  if (frac !== undefined) return frac.length >= 2 ? value : value + k;
  if (whole.length >= maxDigits) return value;
  return whole === '0' ? k : value + k;
}
