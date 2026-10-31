'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Keypad, { Key } from './Keypad';
import { cx } from './ui';

/** Four PIN dots + keypad. Calls onComplete when 4 digits are entered. `resetKey` clears it. */
export default function PinPad({ onComplete, error, busy, resetKey }: { onComplete: (pin: string) => void; error?: string | null; busy?: boolean; resetKey?: number }) {
  const [pin, setPinState] = useState('');
  const pinRef = useRef('');
  const setPin = (p: string) => { pinRef.current = p; setPinState(p); };
  const [shake, setShake] = useState(false);
  useEffect(() => { setPin(''); }, [resetKey]);
  useEffect(() => { if (error) { setShake(true); const t = setTimeout(() => setShake(false), 450); return () => clearTimeout(t); } }, [error, resetKey]);
  // Side effects stay outside state updaters (which React may run twice in development).
  const onKey = useCallback((k: Key) => {
    if (busy) return;
    const p = pinRef.current;
    if (k === 'del') return setPin(p.slice(0, -1));
    if (k === '.' || p.length >= 4) return;
    const next = p + k;
    setPin(next);
    if (next.length === 4) setTimeout(() => onComplete(next), 120);
  }, [busy, onComplete]);
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center py-6">
        <div className={cx('flex gap-4', shake && 'shake')} role="img" aria-label={`${pin.length} of 4 digits entered`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cx('h-4 w-4 rounded-full border-2 transition-colors duration-150', i < pin.length ? (error ? 'border-danger bg-danger' : 'border-primary bg-primary') : 'border-line-strong')} />
          ))}
        </div>
        <p role="alert" className="mt-5 h-5 text-label font-medium text-danger">{error ?? ''}</p>
      </div>
      <Keypad onKey={onKey} disabled={busy} />
    </div>
  );
}
