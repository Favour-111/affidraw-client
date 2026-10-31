import { ClerkProvider } from '@clerk/nextjs';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const page = <div className="min-h-dvh bg-surface"><div className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-5 py-6">{children}</div></div>;
  // Clerk only loads on the auth screens; the rest of the app runs on the Affidraw session cookie.
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ClerkProvider>{page}</ClerkProvider> : page;
}
