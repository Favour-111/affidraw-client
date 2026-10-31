'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Lock } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/hooks';
import FlowHeader from '@/components/FlowHeader';
import PinPad from '@/components/PinPad';
import { Button, Field, Skeleton, inputCls } from '@/components/ui';

const safe = (u: string | null) => (u && u.startsWith('/') && !u.startsWith('//') ? u : '/wallet');

export default function CreatePin() {
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();
  const user = me.data?.user;
  const [returnUrl, setReturnUrl] = useState('/wallet');
  const [step, setStep] = useState<'password' | 'create' | 'confirm' | 'done'>('create');
  const [first, setFirst] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(0);

  useEffect(() => { setReturnUrl(safe(new URLSearchParams(window.location.search).get('returnUrl'))); }, []);
  useEffect(() => {
    if (me.isSuccess && !user) router.replace('/login?next=/pin/create');
    if (user?.hasPin && step === 'create' && !first) setStep('password'); // changing an existing PIN
  }, [me.isSuccess, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(pin: string) {
    setBusy(true); setErr(null);
    try {
      await api('/me/pin', { body: { pin, ...(user?.hasPassword ? { currentPassword: password || undefined } : { currentPin: password || undefined }) } });
      await qc.invalidateQueries({ queryKey: ['me'] });
      setStep('done');
      setTimeout(() => router.replace(returnUrl), 1100);
    } catch (e) {
      const ae = e as ApiError;
      setErr(ae.message);
      if (ae.code === 'PASSWORD_REQUIRED') { setStep('password'); setFirst(''); } else { setStep('create'); setFirst(''); setReset((r) => r + 1); }
    } finally {
      setBusy(false);
    }
  }

  const onComplete = (pin: string) => {
    if (step === 'create') { setFirst(pin); setErr(null); setStep('confirm'); setReset((r) => r + 1); return; }
    if (pin !== first) { setErr('PINs don’t match. Start again.'); setFirst(''); setStep('create'); setReset((r) => r + 1); return; }
    save(pin);
  };

  if (!user) return <Skeleton className="mt-20 h-64 w-full" />;
  const changing = user.hasPin;

  return (
    <>
      <FlowHeader title="" closeHref={returnUrl} onBack={step === 'confirm' ? () => { setStep('create'); setFirst(''); setErr(null); setReset((r) => r + 1); } : undefined} />
      <div className="mt-10 text-center">
        {step === 'done' ? <CheckCircle2 className="pop mx-auto h-10 w-10 text-primary" aria-hidden /> : <Lock className="mx-auto h-9 w-9 text-primary" fill="currentColor" strokeWidth={1.5} aria-hidden />}
        <h2 className="mt-5 text-display font-bold">
          {step === 'done' ? 'PIN saved' : step === 'password' ? 'Confirm it’s you' : step === 'confirm' ? 'Confirm your PIN' : changing ? 'Create a new PIN' : 'Create Unique PIN'}
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-body text-muted">
          {step === 'done' ? 'You’re all set.' : step === 'password' ? (user.hasPassword ? 'Enter your account password to change your transaction PIN.' : 'Enter your current PIN to set a new one.') : step === 'confirm' ? 'Enter the same 4 digits again.' : 'Your 4-digit PIN authorises withdrawals and prize claims. Avoid easy PINs like 1234.'}
        </p>
      </div>
      {step === 'password' ? (
        <form className="mt-10 space-y-5" onSubmit={(e) => { e.preventDefault(); if (password) { setErr(null); setStep('create'); setReset((r) => r + 1); } }}>
          <Field label={user.hasPassword ? 'Account password' : 'Current PIN'} required error={err ?? undefined}>
            <input autoFocus type="password" autoComplete={user.hasPassword ? 'current-password' : 'off'} inputMode={user.hasPassword ? undefined : 'numeric'} maxLength={user.hasPassword ? 200 : 4} className={inputCls} value={password} onChange={(e) => setPassword(user.hasPassword ? e.target.value : e.target.value.replace(/\D/g, ''))} />
          </Field>
          <Button type="submit" full size="lg" disabled={!password}>Continue</Button>
        </form>
      ) : step !== 'done' && (
        <PinPad onComplete={onComplete} error={err} busy={busy} resetKey={reset} />
      )}
    </>
  );
}
