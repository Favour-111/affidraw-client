'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useClerk, useSignIn, useSignUp } from '@clerk/nextjs';
import { clerkMessage, saveSignupExtras, useClerkExchange } from '@/lib/clerk';
import { Alert, Button, Field, cx, inputCls } from '@/components/ui';
import { AUTH_ERRORS, AuthHeading, AuthTopBar, BusinessToggle, GoogleButton, PasswordInput, SwitchLink, useNext } from './authParts';

type Step = 'form' | 'code' | 'reset' | 'reset-code';
/** Which code the "code" step is verifying. */
type CodeKind = 'signup' | 'mfa_email' | 'mfa_totp';
type Res = { error: unknown };

/**
 * Login/signup through Clerk's custom-flow API, rendered with Affidraw's own components.
 * Clerk proves who the user is; the backend then issues the normal Affidraw session (see useClerkExchange).
 */
export default function ClerkAuthForm({ mode }: { mode: 'login' | 'register' }) {
  const login = mode === 'login';
  const next = useNext();
  const sp = useSearchParams();
  const clerk = useClerk();
  const { signIn, errors: inErrors } = useSignIn();
  const { signUp, errors: upErrors } = useSignUp();
  const exchange = useClerkExchange();

  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', isBusiness: false, code: '', newPassword: '' });
  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));
  const [step, setStep] = useState<Step>('form');
  const [codeKind, setCodeKind] = useState<CodeKind>('signup');
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const finishing = useRef(false);

  useEffect(() => { const e = sp.get('error'); if (e) setMsg({ tone: 'error', text: AUTH_ERRORS[e] ?? AUTH_ERRORS.clerk_failed }); }, [sp]);
  // A Clerk session left over from an interrupted sign-in must not log anyone in silently.
  useEffect(() => {
    if (clerk.loaded && clerk.session && !finishing.current) clerk.signOut({ redirectUrl: window.location.pathname + window.location.search });
  }, [clerk, clerk.loaded]);

  const extras = () => ({ name: f.name.trim(), phone: f.phone.trim(), isBusiness: f.isBusiness });

  /** Runs a Clerk call; returns false (and shows the message) when it failed. */
  async function run(call: Promise<Res>, fallback?: string) {
    try {
      const { error } = await call;
      if (error) { setMsg({ tone: 'error', text: clerkMessage(error, fallback) }); return false; }
      return true;
    } catch (e) {
      setMsg({ tone: 'error', text: clerkMessage(e, fallback) });
      return false;
    }
  }

  /** Clerk's script loads from Clerk's servers; calls made before it is ready do nothing, so wait for it (up to 15s). */
  async function whenReady() {
    for (let waited = 0; !clerk.loaded; waited += 100) {
      if (waited >= 15_000) {
        setMsg({ tone: 'error', text: 'We couldn’t reach the sign-in service. Check your internet connection and try again.' });
        return false;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return true;
  }

  async function finish(resource: 'signIn' | 'signUp') {
    finishing.current = true;
    const ok = await run(resource === 'signIn' ? signIn.finalize() : signUp.finalize());
    if (!ok) { finishing.current = false; return; }
    await exchange(next, login ? {} : extras()); // navigates away
  }

  /** After a password/reset step: either done, or a second check (new device / 2FA) is needed. */
  async function afterSignInStep() {
    if (signIn.status === 'complete') return finish('signIn');
    if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
      const factors = signIn.supportedSecondFactors.map((x) => x.strategy);
      if (factors.includes('email_code')) {
        if (!(await run(signIn.mfa.sendEmailCode()))) return;
        setCodeKind('mfa_email');
      } else if (factors.includes('totp')) {
        setCodeKind('mfa_totp');
      } else {
        return setMsg({ tone: 'error', text: 'This account needs a verification method we don’t support yet. Contact support.' });
      }
      set('code', '');
      setStep('code');
      return;
    }
    setMsg({ tone: 'error', text: AUTH_ERRORS.clerk_failed });
  }

  async function afterSignUpStep() {
    if (signUp.status === 'complete') return finish('signUp');
    if (signUp.unverifiedFields.includes('email_address')) {
      if (!(await run(signUp.verifications.sendEmailCode()))) return;
      setCodeKind('signup');
      set('code', '');
      setStep('code');
      return;
    }
    setMsg({ tone: 'error', text: `We still need: ${signUp.missingFields.join(', ').replace(/_/g, ' ') || 'more details'}. Contact support.` });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true); setMsg(null);
    try {
      if (!(await whenReady())) return;
      if (step === 'form' && login) {
        if (await run(signIn.password({ identifier: f.email.trim(), password: f.password }))) await afterSignInStep();
      } else if (step === 'form') {
        const [firstName, ...rest] = f.name.trim().split(/\s+/);
        if (await run(signUp.password({ emailAddress: f.email.trim(), password: f.password, firstName, lastName: rest.join(' ') || undefined }))) await afterSignUpStep();
      } else if (step === 'code') {
        const code = f.code.trim();
        if (codeKind === 'signup') {
          if (await run(signUp.verifications.verifyEmailCode({ code }))) await afterSignUpStep();
        } else if (await run(codeKind === 'mfa_email' ? signIn.mfa.verifyEmailCode({ code }) : signIn.mfa.verifyTOTP({ code }))) {
          await afterSignInStep();
        }
      } else if (step === 'reset') {
        if ((await run(signIn.create({ identifier: f.email.trim() }))) && (await run(signIn.resetPasswordEmailCode.sendCode()))) {
          set('code', ''); set('newPassword', '');
          setStep('reset-code');
        }
      } else if (step === 'reset-code') {
        const verified = signIn.status === 'needs_new_password' || (await run(signIn.resetPasswordEmailCode.verifyCode({ code: f.code.trim() })));
        if (verified && (await run(signIn.resetPasswordEmailCode.submitPassword({ password: f.newPassword, signOutOfOtherSessions: true })))) await afterSignInStep();
      }
    } finally {
      if (!finishing.current) setBusy(false);
    }
  }

  async function resend() {
    setMsg(null);
    const ok = await run(codeKind === 'signup' ? signUp.verifications.sendEmailCode() : step === 'reset-code' ? signIn.resetPasswordEmailCode.sendCode() : signIn.mfa.sendEmailCode());
    if (ok) setMsg({ tone: 'success', text: 'We sent you a new code.' });
  }

  async function google() {
    if (googleBusy) return;
    setMsg(null);
    setGoogleBusy(true);
    // On success the page navigates to Google, so the button stays locked; unlock only on failure.
    if (!(await whenReady()) || !(await startGoogle())) setGoogleBusy(false);
  }

  async function startGoogle() {
    if (!login) saveSignupExtras({ phone: f.phone.trim(), isBusiness: f.isBusiness });
    const origin = window.location.origin;
    const params = {
      strategy: 'oauth_google' as const,
      redirectUrl: `${origin}/auth/complete?next=${encodeURIComponent(next)}`,
      redirectCallbackUrl: `${origin}/sso-callback?next=${encodeURIComponent(next)}`,
    };
    return run(login ? signIn.sso(params) : signUp.sso(params), AUTH_ERRORS.google_failed);
  }

  const fe = login ? inErrors.fields : upErrors.fields;
  const fieldErr = (x: { longMessage?: string; message: string } | null | undefined) => x?.longMessage ?? x?.message;
  // Field-level errors render under their input; don't repeat them in the banner.
  // Only fields with an input on this step; errors on any other field (username, legalAccepted...) stay in the banner.
  const visible =
    step === 'form' ? (login ? [inErrors.fields.identifier, inErrors.fields.password] : [upErrors.fields.firstName, upErrors.fields.emailAddress, upErrors.fields.password])
    : step === 'reset' ? [inErrors.fields.identifier]
    : step === 'reset-code' ? [inErrors.fields.code, inErrors.fields.password]
    : [fe.code];
  const fieldTexts = visible.map(fieldErr).filter(Boolean);
  const showMsg = msg && !(msg.tone === 'error' && fieldTexts.includes(msg.text));
  const emailOk = /\S+@\S+\.\S+/.test(f.email);
  const ready =
    step === 'form' ? emailOk && (login ? f.password.length > 0 : f.password.length >= 8 && f.name.trim().length >= 2)
    : step === 'reset' ? emailOk
    : step === 'reset-code' ? f.code.trim().length >= 6 && f.newPassword.length >= 8
    : f.code.trim().length >= 6;

  const back = () => { setMsg(null); setStep(step === 'reset-code' ? 'reset' : 'form'); };
  const heading: Record<Step, [string, React.ReactNode]> = {
    form: login ? ['Log in to your account', 'Enter your details and pick up where you left off.'] : ['Create your account', 'It takes a minute. You must be 18 or older to enter draws.'],
    code: codeKind === 'mfa_totp' ? ['Enter your code', 'Open your authenticator app and enter the 6-digit code.'] : ['Check your email', <>We sent a 6-digit code to <span className="font-semibold text-ink">{f.email.trim()}</span>.</>],
    reset: ['Reset your password', 'Enter your email and we’ll send you a code to set a new password.'],
    'reset-code': ['Set a new password', <>Enter the code we sent to <span className="font-semibold text-ink">{f.email.trim()}</span> and choose a new password.</>],
  };
  const codeField = (
    <Field label="Verification code" required error={fieldErr(fe.code)}
      action={codeKind !== 'mfa_totp' || step === 'reset-code' ? <button type="button" onClick={resend} className="text-meta font-semibold text-muted hover:text-ink">Resend code</button> : undefined}>
      <input autoFocus className={cx(inputCls, 'text-center text-heading font-semibold tracking-[0.5em]')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••"
        value={f.code} onChange={(e) => set('code', e.target.value.replace(/\D/g, '').slice(0, 6))} />
    </Field>
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <AuthTopBar onBack={step === 'form' ? undefined : back} />
      <AuthHeading title={heading[step][0]} sub={heading[step][1]} />

      <div className="mt-8 space-y-5">
        {showMsg && <Alert tone={msg.tone}>{msg.text}</Alert>}

        {step === 'form' && (
          <>
            {!login && <Field label="Full name" required error={fieldErr(upErrors.fields.firstName)}><input className={inputCls} autoComplete="name" placeholder="e.g. Ada Okafor" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>}
            <Field label="Email address" required error={fieldErr(login ? inErrors.fields.identifier : upErrors.fields.emailAddress)}><input className={inputCls} type="email" inputMode="email" autoComplete="email" placeholder="e.g. you@example.com" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
            {!login && <Field label="Phone number" hint="Optional — used for prize delivery if you win."><input className={inputCls} type="tel" autoComplete="tel" placeholder="e.g. 0801 234 5678" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>}
            <Field label="Password" required error={fieldErr(fe.password)} hint={login ? undefined : 'At least 8 characters.'}
              action={login ? <button type="button" onClick={() => { setMsg(null); setStep('reset'); }} className="text-meta font-semibold text-muted hover:text-ink">Forgot password?</button> : undefined}>
              <PasswordInput value={f.password} onChange={(v) => set('password', v)} autoComplete={login ? 'current-password' : 'new-password'} />
            </Field>
            {!login && <BusinessToggle checked={f.isBusiness} onChange={(v) => set('isBusiness', v)} />}
            {/* Clerk mounts its bot-protection challenge here during sign-up. */}
            {!login && <div id="clerk-captcha" />}
          </>
        )}

        {step === 'code' && codeField}

        {step === 'reset' && <Field label="Email address" required error={fieldErr(inErrors.fields.identifier)}><input autoFocus className={inputCls} type="email" inputMode="email" autoComplete="email" placeholder="e.g. you@example.com" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>}

        {step === 'reset-code' && (
          <>
            {codeField}
            <Field label="New password" required hint="At least 8 characters." error={fieldErr(inErrors.fields.password)}>
              <PasswordInput value={f.newPassword} onChange={(v) => set('newPassword', v)} autoComplete="new-password" placeholder="New password" />
            </Field>
          </>
        )}
      </div>

      {step === 'form' && <GoogleButton login={login} onClick={google} disabled={busy} loading={googleBusy} />}

      <div className="mt-auto pt-10">
        <Button type="submit" full size="lg" loading={busy} disabled={!ready}>{step === 'reset' ? 'Send code' : step === 'reset-code' ? 'Update password' : 'Continue'}</Button>
        {step === 'form' ? <SwitchLink login={login} next={next} /> : <p className="mt-5 text-center text-label text-muted"><button type="button" onClick={back} className="font-semibold text-primary-text hover:underline">{step === 'code' ? 'Use a different email' : 'Back'}</button></p>}
      </div>
    </form>
  );
}
