'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Me } from './types';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: Me | null; unreadNotifications?: number }>('/auth/me'),
    staleTime: 30_000,
  });
}

export type WalletSummary = { balance: number; pendingDeposits: number; totalSpent: number; totalDeposited: number; currency: string };
export function useWallet(enabled = true) {
  return useQuery({ queryKey: ['wallet'], queryFn: () => api<WalletSummary>('/me/wallet'), enabled, staleTime: 15_000 });
}

/** One key per user intent, so retries and double taps can never create two charges. */
export const newIdempotencyKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
