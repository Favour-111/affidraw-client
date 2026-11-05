'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowLeft, Building2, ClipboardList, Gift, LayoutGrid, Receipt, ScrollText, Shuffle, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useMe } from '@/lib/hooks';
import Logo from '@/components/Logo';
import { Skeleton, cx } from '@/components/ui';

const NAV = [
  ['/admin', 'Overview', LayoutGrid], ['/admin/campaigns', 'Campaigns', ClipboardList], ['/admin/draws', 'Draws', Shuffle], ['/admin/claims', 'Prize claims', Gift],
  ['/admin/businesses', 'Businesses', Building2], ['/admin/users', 'Users', Users], ['/admin/purchases', 'Purchases', Receipt], ['/admin/audit', 'Audit log', ScrollText],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const path = usePathname();
  const router = useRouter();
  const user = me.data?.user;
  const overview = useQuery({ queryKey: ['admin-overview'], queryFn: () => api<{ metrics: Record<string, number> }>('/admin/overview'), refetchInterval: 60_000, enabled: user?.role === 'ADMIN' });
  const badges: Record<string, number | undefined> = { '/admin/businesses': overview.data?.metrics.pendingVerifications };
  useEffect(() => { if (me.isSuccess && (!user || user.role !== 'ADMIN')) router.replace(user ? '/' : '/login?next=/admin'); }, [me.isSuccess, user, router]);
  // The API enforces the ADMIN role on every call; this guard only avoids flashing the UI.
  if (!user || user.role !== 'ADMIN') return <div className="p-6"><Skeleton className="h-40 w-full" /></div>;
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      <aside className="border-b border-line bg-surface md:sticky md:top-0 md:h-dvh md:border-b-0 md:border-r">
        <div className="flex h-16 items-center px-4"><Logo href="/admin" suffix="Admin" /></div>
        <nav aria-label="Admin" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV.map(([href, label, Icon]) => {
            const active = href === '/admin' ? path === href : path.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cx('flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-label font-semibold transition-colors', active ? 'bg-primary-soft text-primary-text' : 'text-muted hover:bg-surface-2 hover:text-ink')}>
                <Icon className={cx('hidden h-4.5 w-4.5 md:block', active && 'text-primary')} aria-hidden />{label}
                {!!badges[href] && <span className="ml-auto rounded-full bg-warning-soft px-1.5 text-micro font-bold tabular-nums text-warning">{badges[href]}<span className="sr-only"> pending</span></span>}
              </Link>
            );
          })}
          <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-label text-muted hover:bg-surface-2 md:mt-6"><ArrowLeft className="hidden h-4.5 w-4.5 md:block" aria-hidden />Back to app</Link>
        </nav>
      </aside>
      <main className="min-w-0 px-4 py-6 md:px-8 md:py-8"><div className="mx-auto max-w-5xl">{children}</div></main>
    </div>
  );
}
