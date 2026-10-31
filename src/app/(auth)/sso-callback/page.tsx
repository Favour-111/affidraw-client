'use client';
import { Suspense } from 'react';
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { useNext } from '../authParts';
import Finishing from '../Finishing';

/** Google returns here; Clerk completes (or transfers sign-in ↔ sign-up) and moves on to /auth/complete. */
function Callback() {
  const done = `/auth/complete?next=${encodeURIComponent(useNext())}`;
  return (
    <>
      <Finishing />
      <AuthenticateWithRedirectCallback signInForceRedirectUrl={done} signUpForceRedirectUrl={done} signInUrl="/login" signUpUrl="/register" />
      <div id="clerk-captcha" />
    </>
  );
}

export default function Page() {
  return <Suspense fallback={<Finishing />}><Callback /></Suspense>;
}
