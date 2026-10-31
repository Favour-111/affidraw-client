'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { User } from 'lucide-react';
import { useMe } from '@/lib/hooks';
import Logo from '@/components/Logo';
import { IconButton, Skeleton } from '@/components/ui';

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const user = me.data?.user;
  useEffect(() => { if (me.isSuccess && (!user || user.role !== 'BUSINESS')) router.replace(user ? '/' : '/login?next=/business'); }, [me.isSuccess, user, router]);
  if (!user || user.role !== 'BUSINESS') return <div className="p-6"><Skeleton className="h-40 w-full" /></div>;
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Logo href="/business" suffix="Business" />
          <IconButton href="/profile" label="Account" round><User className="h-4.5 w-4.5" /></IconButton>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
