'use client';
import { useCallback, useState } from 'react';
import Keypad, { applyAmountKey, Key } from './Keypad';
import { Alert, Button, cx } from './ui';
import { naira } from '@/lib/format';

const QUICK = [1000, 5000, 10000, 100000];

/** Big centred amount + additive quick chips + keypad, as in the reference deposit/withdraw screens. */
export default function AmountPad({ min, max, initial = '', continueLabel = 'Continue', busy, error, maxError, onContinue }: {
  min: number; max: number; initial?: string; continueLabel?: string; busy?: boolean; error?: string | null; maxError?: string; onContinue: (kobo: number) => void;
}) {
  const [value, setValue] = useState(initial);
  const amount = Number(value || '0');
  const kobo = Math.round(amount * 100);
  const tooLow = amount > 0 && amount < min;
  const tooHigh = amount > max;
  const valid = amount >= min && !tooHigh;
  const onKey = useCallback((k: Key) => setValue((v) => applyAmountKey(v, k)), []);
  const submit = useCallback(() => { if (valid && !busy) onContinue(kobo); }, [valid, busy, kobo, onContinue]);

  const [whole, frac] = value.split('.');
  const display = value ? Number(whole || '0').toLocaleString('en-NG') + (frac !== undefined ? '.' + frac : '') : '0';

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center py-8" aria-live="polite">
        <p className="flex items-baseline" aria-label={`Amount ${naira(kobo)}`}>
          <span className={cx('mr-1 text-[1.3125rem] font-bold', value ? 'text-subtle' : 'text-line-strong')}>₦</span>
          <span className={cx('tabular text-[2.75rem] font-extrabold leading-none tracking-[-0.03em]', value ? 'text-ink' : 'text-line-strong')}>{display}</span>
          <span className="caret ml-1 inline-block h-12 w-[2px] translate-y-1 bg-primary" aria-hidden />
        </p>
        <p className={cx('mt-4 h-5 text-label', tooHigh ? 'font-semibold text-danger' : 'text-muted')}>
          {tooHigh ? (maxError ?? `Maximum of ${naira(max * 100)}`) : !valid || tooLow ? `Minimum of ${naira(min * 100)}` : ''}
        </p>
      </div>

      <div className="space-y-5">
        <div className="mx-auto grid max-w-sm grid-cols-4 gap-1.5 sm:gap-2" role="group" aria-label="Add a quick amount">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => setValue(String(Math.min(9_999_999, Math.floor(amount) + q)))}
              className="tabular h-9 truncate rounded-lg bg-surface-2 px-1 text-[0.6875rem] font-semibold text-muted transition-colors hover:bg-surface-3 hover:text-ink sm:text-label">
              +{naira(q * 100)}
            </button>
          ))}
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <div className={cx('transition-opacity', valid ? 'opacity-100' : 'pointer-events-none opacity-0')} aria-hidden={!valid}>
          <Button full size="lg" onClick={submit} loading={busy} tabIndex={valid ? 0 : -1}>{continueLabel}</Button>
        </div>
        <Keypad onKey={onKey} decimal onEnter={submit} disabled={busy} />
      </div>
    </div>
  );
}
