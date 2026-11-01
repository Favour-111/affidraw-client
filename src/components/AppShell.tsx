'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Plus, Store, Ticket, Trophy, User } from 'lucide-react';
import { api } from '@/lib/api';
import { naira } from '@/lib/format';
import { useMe, useWallet } from '@/lib/hooks';
import Logo from './Logo';
import { LinkButton, cx } from './ui';

export const MAIN_TABS = [
  { href: '/', label: 'Market', icon: Store, match: (p: string) => p === '/' },
  { href: '/tickets', label: 'My Tickets', icon: Ticket, match: (p: string) => p.startsWith('/tickets') },
  { href: '/profile', label: 'Profile', icon: User, match: (p: string) => p.startsWith('/profile') },
];
/** Bottom-nav highlighting also covers the screens reached from each destination. */
const NAV_MATCH = [
  (p: string) => p === '/' || p.startsWith('/campaigns'),
  (p: string) => p.startsWith('/tickets') || p.startsWith('/purchases'),
  (p: string) => p.startsWith('/profile'),
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data, isLoading } = useMe();
  const user = data?.user;
  const unread = data?.unreadNotifications ?? 0;
  const isMain = MAIN_TABS.some((t) => t.match(path));
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      <header className={cx('sticky top-0 z-30 bg-tint/90 backdrop-blur-md transition-[border-color,box-shadow]', scrolled ? 'border-b border-line shadow-[0_1px_8px_rgb(16_35_26/0.04)]' : 'border-b border-transparent')}>
        <div className="mx-auto flex h-16 max-w-6xl sm:h-[72px] items-center justify-between gap-3 px-4">
          <Logo size="lg" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isLoading ? (
              <div className="skeleton h-11 w-40 rounded-xl" />
            ) : user ? (
              <HeaderChips unread={unread} />
            ) : (
              <>
                <LinkButton href={`/login?next=${encodeURIComponent(path)}`} variant="secondary" size="sm">Log in</LinkButton>
                <LinkButton href={`/register?next=${encodeURIComponent(path)}`} size="sm">Sign up</LinkButton>
              </>
            )}
          </div>
        </div>
      </header>

      {isMain && (
        <nav aria-label="Main" className="mx-auto hidden w-full max-w-6xl px-4 pt-6 md:block">
          <ul className="flex items-baseline gap-6">
            {MAIN_TABS.map((t) => {
              const on = t.match(path);
              return (
                <li key={t.href}>
                  <Link href={t.href} aria-current={on ? 'page' : undefined} className={cx('text-display font-bold transition-colors', on ? 'text-ink' : 'text-subtle hover:text-muted')}>{t.label}</Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-14 pt-6">{children}</main>

      <Footer />

      <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-3">
          {MAIN_TABS.map((t, i) => {
            const on = NAV_MATCH[i](path);
            const Icon = t.icon;
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={on ? 'page' : undefined} className={cx('flex h-14 flex-col items-center justify-center gap-1 text-[0.65rem] font-semibold transition-colors', on ? 'text-primary-text' : 'text-subtle')}>
                  <Icon className={cx('h-5 w-5', on && 'text-primary')} strokeWidth={on ? 2.25 : 1.75} aria-hidden />
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

const CHIP = 'relative inline-flex h-9 sm:h-11 items-center justify-center rounded-xl border border-line/80 bg-surface/70 text-ink transition-colors hover:border-line-strong hover:bg-surface';

/** Right-hand header controls, modelled on the reference: trophy · money chip with + · bell. */
function usePrefetchMain(enabled: boolean) {
  const qc = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const idle = (cb: () => void) => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(cb, { timeout: 1500 }) : setTimeout(cb, 600));
    idle(() => {
      ['/', '/tickets', '/profile', '/wallet', '/notifications'].forEach((r) => router.prefetch(r));
      qc.prefetchQuery({ queryKey: ['my-tickets', 'active'], queryFn: () => api('/me/tickets?tab=active'), staleTime: 30_000 });
      qc.prefetchQuery({ queryKey: ['wallet-tx'], queryFn: () => api('/me/wallet/transactions?pageSize=50'), staleTime: 30_000 });
      qc.prefetchQuery({ queryKey: ['claims'], queryFn: () => api('/me/claims'), staleTime: 60_000 });
    });
  }, [enabled, qc, router]);
}

function HeaderChips({ unread }: { unread: number }) {
  usePrefetchMain(true);
  const wallet = useWallet();
  const wins = useQuery({ queryKey: ['my-tickets', 'won'], queryFn: () => api<{ counts: { won: number } }>('/me/tickets?tab=won'), staleTime: 60_000 });
  const won = wins.data?.counts.won ?? 0;
  const balance = wallet.data?.balance ?? 0;
  return (
    <>
      <Link href="/tickets?tab=won" aria-label={won ? `My wins, ${won}` : 'My wins'} title="My wins" className={cx(CHIP, 'w-9 max-[374px]:hidden sm:w-11')}>
        <Trophy className="h-4.5 w-4.5 text-[#e8a317] sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />
        {won > 0 && <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-tint bg-primary-strong px-1 text-[10px] font-bold leading-none text-white">{won}</span>}
      </Link>
      <div className={cx(CHIP, 'gap-1 pl-3 pr-1.5 sm:pl-3.5')}>
        <Link href="/wallet" aria-label={`Wallet balance ${naira(balance)}`} title="Wallet" className="tabular pr-1 text-label font-bold text-ink sm:pr-1.5 sm:text-body">
          {wallet.isLoading ? <span className="skeleton inline-block h-4 w-10 align-middle" /> : naira(balance)}
        </Link>
        <Link href="/wallet/deposit" aria-label="Add money to wallet" title="Add money" className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-strong text-white sm:h-7 sm:w-7 transition-colors hover:bg-primary-strong-hover">
          <Plus className="h-4 w-4" strokeWidth={2.75} aria-hidden />
        </Link>
      </div>
      <Link href="/notifications" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} className={cx(CHIP, 'w-9 sm:w-11')}>
        <Bell className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />
        {unread > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" aria-hidden />}
      </Link>
    </>
  );
}

function Footer() {
  const col = 'space-y-2.5 text-label';
  const a = 'text-white/70 transition-colors hover:text-white';
  return (
    <footer className="bg-footer pb-nav text-white md:pb-0">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 md:grid-cols-4">
        <div className="col-span-2">
          <Logo inverse />
          <p className="mt-4 max-w-sm text-label text-white/70">Discover verified prizes, enter transparent draws, and watch every official result.</p>
        </div>
        <div>
          <p className="mb-3 text-label font-bold">Explore</p>
          <ul className={col}>
            <li><Link className={a} href="/">Market</Link></li>
            <li><Link className={a} href="/tickets">My Tickets</Link></li>
            <li><a className={a} href="mailto:support@raffler.example">Help &amp; support</a></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-label font-bold">Legal</p>
          <ul className={col}>
            <li><Link className={a} href="/legal/terms">Terms &amp; conditions</Link></li>
            <li><Link className={a} href="/legal/privacy">Privacy policy</Link></li>
            <li><Link className={a} href="/legal/responsible">Responsible participation</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-6 text-meta text-white/60">
          <p>Entering a draw costs money and winning is never guaranteed — only spend what you can afford. Participation is restricted to people aged 18 and over. Every result is published with the evidence needed to verify it.</p>
          <p className="font-semibold text-white/80">© {new Date().getFullYear()} Raffler. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
