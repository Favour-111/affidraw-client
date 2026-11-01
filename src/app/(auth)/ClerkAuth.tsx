'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SignIn, SignUp } from '@clerk/nextjs';
import { saveSignupExtras, takeSignupExtras } from '@/lib/clerk';
import { Alert } from '@/components/ui';
import { AUTH_ERRORS, AuthHeading, AuthTopBar, BusinessToggle, useNext } from './authParts';

/**
 * Clerk's prebuilt screens restyled to match the site's own forms. Clerk's CSS lives in the `clerk`
 * layer (see globals.css), and the classes end in `!` (important) because some Clerk runtime styles are unlayered; colours are CSS variables, so dark mode follows.
 */
const appearance = {
  cssLayerName: 'clerk',
  options: { socialButtonsPlacement: 'bottom' as const, socialButtonsVariant: 'blockButton' as const, unsafe_disableDevelopmentModeWarnings: true },
  variables: {
    colorPrimary: 'var(--primary-strong)',
    colorPrimaryForeground: '#ffffff',
    colorForeground: 'var(--ink)',
    colorMutedForeground: 'var(--muted)',
    colorBackground: 'var(--surface)',
    colorInput: 'var(--surface)',
    colorInputForeground: 'var(--ink)',
    colorBorder: 'var(--border-strong)',
    colorDanger: 'var(--danger)',
    fontFamily: 'inherit',
    borderRadius: '10px',
  },
  elements: {
    rootBox: 'w-full!',
    // Clerk's card has a -1px margin inside an overflow-hidden box, which clips the inputs' side borders.
    cardBox: 'w-full! max-w-none! overflow-visible! rounded-none! border-0! bg-transparent! shadow-none!',
    card: 'm-0! gap-6! rounded-none! border-0! bg-transparent! p-0! shadow-none!',
    header: 'items-start! text-left!',
    headerTitle: 'text-title! font-bold! text-ink!',
    headerSubtitle: 'text-body! text-muted!',
    main: 'gap-6!',
    form: 'gap-5!',
    formFieldLabel: 'text-label! font-semibold! text-ink!',
    formFieldInput: 'h-12! max-h-none! rounded-[10px]! border! border-line-strong! bg-surface! px-3.5! text-body! text-ink! shadow-none! outline-none! focus:border-primary! focus:ring-3! focus:ring-primary/15!',
    formFieldAction: 'text-meta! font-semibold! text-muted! hover:text-ink!',
    formFieldHintText: 'text-meta! text-muted!',
    formFieldErrorText: 'text-meta! text-danger!',
    formButtonPrimary: 'h-12! rounded-[10px]! bg-primary-strong! bg-none! text-body! font-semibold! normal-case! text-white! shadow-none! hover:bg-primary-strong-hover! after:hidden!',
    buttonArrowIcon: 'hidden!',
    socialButtonsBlockButton: 'h-12! rounded-[10px]! border-0! bg-surface-2! shadow-none! hover:bg-surface-3!',
    socialButtonsBlockButtonText: 'text-body! font-semibold! text-ink!',
    dividerLine: 'bg-line!',
    dividerText: 'text-meta! font-medium! uppercase! text-muted!',
    otpCodeFieldInput: 'rounded-[10px]! border! border-line-strong!',
    identityPreview: 'rounded-[10px]! border! border-line! bg-surface-2!',
    alert: 'rounded-[10px]!',
    footer: 'mt-2! border-0! bg-transparent! bg-none! p-0! shadow-none!',
    footerAction: 'justify-center!',
    footerActionText: 'text-label! text-muted!',
    footerActionLink: 'text-label! font-semibold! text-primary-text! hover:underline!',
  },
};

/**
 * Login/signup with Clerk's own UI. After Clerk signs the user in, /auth/complete trades the
 * Clerk session for the normal Affidraw session (see useClerkExchange).
 */
export default function ClerkAuth({ mode }: { mode: 'login' | 'register' }) {
  const login = mode === 'login';
  const next = useNext();
  const sp = useSearchParams();
  const done = `/auth/complete?next=${encodeURIComponent(next)}`;
  const [isBusiness, setIsBusiness] = useState(false);
  const error = sp.get('error');

  // Signup extras ride along in sessionStorage (also across the Google redirect); a plain login must not inherit them.
  useEffect(() => {
    if (login) takeSignupExtras();
    else saveSignupExtras({ isBusiness });
  }, [login, isBusiness]);

  return (
    <div className="flex flex-1 flex-col">
      <AuthTopBar />
      <AuthHeading title={login ? 'Log in to your account' : 'Create your account'} sub={login ? 'Enter your details and pick up where you left off.' : 'It takes a minute. You must be 18 or older to enter draws.'} />
      <div className="mt-8 space-y-5">
        {error && <Alert tone="error">{AUTH_ERRORS[error] ?? AUTH_ERRORS.clerk_failed}</Alert>}
        {!login && <BusinessToggle checked={isBusiness} onChange={setIsBusiness} />}
        {login ? (
          <SignIn routing="hash" appearance={appearance} signUpUrl={`/register?next=${encodeURIComponent(next)}`} forceRedirectUrl={done} signUpForceRedirectUrl={done} />
        ) : (
          <SignUp routing="hash" appearance={appearance} signInUrl={`/login?next=${encodeURIComponent(next)}`} forceRedirectUrl={done} signInForceRedirectUrl={done} />
        )}
      </div>
    </div>
  );
}
