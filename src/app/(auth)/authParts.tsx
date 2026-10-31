'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Briefcase, Eye, EyeOff, Headphones } from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import { cx, inputCls } from '@/components/ui';

export const AUTH_ERRORS: Record<string, string> = {
  google_unavailable: 'Google sign-in isn’t available right now. Use your email instead.',
  google_cancelled: 'Google sign-in was cancelled.',
  google_expired: 'That sign-in attempt expired. Please try again.',
  google_state: 'We couldn’t verify that sign-in attempt. Please try again.',
  google_unverified: 'Your Google email address isn’t verified, so we can’t use it to sign in.',
  google_failed: 'Google sign-in failed. Please try again.',
  clerk_failed: 'Sign-in failed. Please try again.',
  unverified: 'Verify your email address to continue.',
  suspended: 'This account is suspended. Contact support.',
};

/** Same-site path to return to after signing in. */
export function useNext() {
  const n = useSearchParams().get('next');
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/';
}

export function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Back + support buttons. `onBack` overrides history navigation (e.g. to step back inside a flow). */
export function AuthTopBar({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between">
      <button type="button" onClick={onBack ?? (() => (history.length > 1 ? router.back() : router.push('/')))} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink hover:bg-surface-3"><ArrowLeft className="h-4.5 w-4.5" /></button>
      <a href="mailto:support@affidraw.example" aria-label="Contact support" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink hover:bg-surface-3"><Headphones className="h-4.5 w-4.5" /></a>
    </div>
  );
}

export function AuthHeading({ title, sub }: { title: string; sub: React.ReactNode }) {
  return (
    <div className="mt-10">
      <LogoMark size={40} />
      <h1 className="mt-6 text-title font-bold">{title}</h1>
      <p className="mt-1.5 text-body text-muted">{sub}</p>
    </div>
  );
}

export function GoogleButton({ login, onClick, disabled, loading }: { login: boolean; onClick: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 text-meta font-medium text-muted" aria-hidden><span className="h-px flex-1 bg-line" />OR<span className="h-px flex-1 bg-line" /></div>
      <button type="button" onClick={onClick} disabled={disabled || loading} aria-busy={loading} className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-[10px] bg-surface-2 text-body font-semibold text-ink transition-colors hover:bg-surface-3 disabled:opacity-60">
        {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-ink" aria-hidden /> : <GoogleLogo />}
        {loading ? 'Opening Google…' : login ? 'Log in with Google' : 'Sign up with Google'}
      </button>
    </div>
  );
}

export function SwitchLink({ login, next }: { login: boolean; next: string }) {
  return (
    <p className="mt-5 text-center text-label text-muted">
      {login ? <>New to Affidraw? <Link className="font-semibold text-primary-text hover:underline" href={`/register?next=${encodeURIComponent(next)}`}>Sign up</Link></> : <>Already have an account? <Link className="font-semibold text-primary-text hover:underline" href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link></>}
    </p>
  );
}

export function BusinessToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors', checked ? 'border-primary bg-primary-soft' : 'border-line hover:bg-surface-2')}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <Briefcase className={cx('mt-0.5 h-5 w-5 shrink-0', checked ? 'text-primary' : 'text-muted')} aria-hidden />
      <span>
        <span className="block text-label font-semibold text-ink">I’m a business offering prizes</span>
        <span className="block text-meta text-muted">Create a sponsor account to submit campaigns.</span>
      </span>
      <span aria-hidden className={cx('ml-auto mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2', checked ? 'border-primary bg-primary' : 'border-line-strong')}>{checked && <span className="h-2 w-2 rounded-sm bg-white" />}</span>
    </label>
  );
}

export function PasswordInput({ value, onChange, autoComplete, placeholder = 'Password', autoFocus }: { value: string; onChange: (v: string) => void; autoComplete: string; placeholder?: string; autoFocus?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <input autoFocus={autoFocus} className={cx(inputCls, 'pr-11')} type={show ? 'text' : 'password'} autoComplete={autoComplete} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-surface-2">{show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}</button>
    </span>
  );
}
