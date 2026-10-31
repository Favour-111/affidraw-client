'use client';
import { useCallback } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';

/** Clerk handles sign-in whenever its publishable key is configured; otherwise the built-in form is used. */
export const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export type SignupExtras = { name?: string; phone?: string; isBusiness?: boolean };
const EXTRAS_KEY = 'affidraw_signup_extras';

/** Signup-only fields survive the Google redirect in sessionStorage (same tab only). */
export function saveSignupExtras(x: SignupExtras) {
  try { sessionStorage.setItem(EXTRAS_KEY, JSON.stringify(x)); } catch { /* storage unavailable: extras are optional */ }
}
export function takeSignupExtras(): SignupExtras {
  try {
    const raw = sessionStorage.getItem(EXTRAS_KEY);
    sessionStorage.removeItem(EXTRAS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Best human-readable message from a Clerk error. */
export function clerkMessage(e: unknown, fallback = 'Something went wrong. Please try again.') {
  const x = e as { errors?: { longMessage?: string; message?: string }[]; longMessage?: string; message?: string } | null;
  return x?.errors?.[0]?.longMessage ?? x?.errors?.[0]?.message ?? x?.longMessage ?? fallback;
}

const ERROR_PARAM: Record<string, string> = { CLERK_EMAIL_UNVERIFIED: 'unverified', ACCOUNT_SUSPENDED: 'suspended' };

/**
 * Trades the active Clerk session for an Affidraw session cookie, then ends the Clerk session:
 * from here on the app only trusts its own cookie, and logging out of Affidraw leaves nothing behind.
 */
export function useClerkExchange() {
  const clerk = useClerk();
  const qc = useQueryClient();
  return useCallback(async (next: string, extras: SignupExtras = {}) => {
    let dest: string;
    try {
      const token = await clerk.session?.getToken();
      if (!token) throw new Error('No Clerk session');
      const body = { token, name: extras.name || undefined, phone: extras.phone || undefined, isBusiness: extras.isBusiness || undefined };
      const r = await api<{ user: { role: string } }>('/auth/clerk', { body });
      await qc.invalidateQueries();
      dest = r.user.role === 'BUSINESS' && next === '/' ? '/business' : r.user.role === 'ADMIN' && next === '/' ? '/admin' : next;
    } catch (e) {
      const code = e instanceof ApiError ? ERROR_PARAM[e.code] : undefined;
      dest = `/login?error=${code ?? 'clerk_failed'}&next=${encodeURIComponent(next)}`;
    }
    await clerk.signOut({ redirectUrl: dest });
  }, [clerk, qc]);
}
