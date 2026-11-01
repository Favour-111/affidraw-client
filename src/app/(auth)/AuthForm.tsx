'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { CLERK_ENABLED } from '@/lib/clerk';
import { Alert, Button, Field, inputCls } from '@/components/ui';
import { AUTH_ERRORS, AuthHeading, AuthTopBar, BusinessToggle, GoogleButton, PasswordInput, SwitchLink, useNext } from './authParts';
import ClerkAuth from './ClerkAuth';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  return CLERK_ENABLED ? <ClerkAuth mode={mode} /> : <PasswordAuthForm mode={mode} />;
}

/** Built-in email/password auth, used when Clerk isn't configured. */
function PasswordAuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const qc = useQueryClient();
  const sp = useSearchParams();
  const next = useNext();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', isBusiness: false });
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));
  const providers = useQuery({ queryKey: ['auth-providers'], queryFn: () => api<{ google: boolean }>('/auth/providers'), staleTime: 300_000 });
  const [googleMsg, setGoogleMsg] = useState<string | null>(null);
  useEffect(() => { const e = sp.get('error'); if (e) setGoogleMsg(AUTH_ERRORS[e] ?? AUTH_ERRORS.google_failed); }, [sp]);
  function google() {
    if (providers.data && !providers.data.google) return setGoogleMsg(AUTH_ERRORS.google_unavailable);
    window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`; // full redirect to Google's consent screen
  }
  const login = mode === 'login';
  const ready = /\S+@\S+\.\S+/.test(f.email) && (login ? f.password.length > 0 : f.password.length >= 10 && f.name.trim().length >= 2);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true); setErr(null);
    try {
      const body = login ? { email: f.email, password: f.password } : { name: f.name, email: f.email, phone: f.phone || undefined, password: f.password, isBusiness: f.isBusiness };
      const r = await api<{ user: { role: string } }>(`/auth/${mode}`, { body });
      await qc.invalidateQueries();
      router.replace(r.user.role === 'BUSINESS' && next === '/' ? '/business' : r.user.role === 'ADMIN' && next === '/' ? '/admin' : next);
    } catch (e) {
      setErr(e as ApiError);
      setBusy(false);
    }
  }
  const fe = (k: string) => err?.details?.[k]?.[0];

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <AuthTopBar />
      <AuthHeading title={login ? 'Log in to your account' : 'Create your account'} sub={login ? 'Enter your details and pick up where you left off.' : 'It takes a minute. You must be 18 or older to enter draws.'} />

      <div className="mt-8 space-y-5">
        {googleMsg && <Alert tone="error">{googleMsg}</Alert>}
        {err && !err.details && <Alert tone="error">{err.message}</Alert>}
        {!login && <Field label="Full name" required error={fe('name')}><input className={inputCls} autoComplete="name" placeholder="e.g. Ada Okafor" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>}
        <Field label="Email address" required error={fe('email')}><input className={inputCls} type="email" inputMode="email" autoComplete="email" placeholder="e.g. you@example.com" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        {!login && <Field label="Phone number" hint="Optional — used for prize delivery if you win." error={fe('phone')}><input className={inputCls} type="tel" autoComplete="tel" placeholder="e.g. 0801 234 5678" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>}
        <Field label="Password" required error={fe('password')} hint={login ? undefined : 'At least 10 characters.'}
          action={login ? <a href="mailto:support@affidraw.example?subject=Password%20reset" className="text-meta font-semibold text-muted hover:text-ink">Forgot password?</a> : undefined}>
          <PasswordInput value={f.password} onChange={(v) => set('password', v)} autoComplete={login ? 'current-password' : 'new-password'} />
        </Field>
        {!login && <BusinessToggle checked={f.isBusiness} onChange={(v) => set('isBusiness', v)} />}
      </div>

      <GoogleButton login={login} onClick={google} />

      <div className="mt-auto pt-10">
        <Button type="submit" full size="lg" loading={busy} disabled={!ready}>Continue</Button>
        <SwitchLink login={login} next={next} />
      </div>
    </form>
  );
}
