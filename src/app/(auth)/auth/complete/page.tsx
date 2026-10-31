'use client';
import { Suspense, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { takeSignupExtras, useClerkExchange } from '@/lib/clerk';
import { useNext } from '../../authParts';
import Finishing from '../../Finishing';

/** Final hop of the Google flow: swap the Clerk session for an Affidraw session. */
function Complete() {
  const clerk = useClerk();
  const router = useRouter();
  const next = useNext();
  const exchange = useClerkExchange();
  const started = useRef(false);
  useEffect(() => {
    if (!clerk.loaded || started.current) return;
    started.current = true;
    if (!clerk.session) router.replace(`/login?error=clerk_failed&next=${encodeURIComponent(next)}`);
    else exchange(next, takeSignupExtras());
  }, [clerk.loaded, clerk.session, exchange, next, router]);
  return <Finishing />;
}

export default function Page() {
  return <Suspense fallback={<Finishing />}><Complete /></Suspense>;
}
