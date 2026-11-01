import { ClerkProvider } from '@clerk/nextjs';

// Our own wording on Clerk's screens (otherwise it uses the application name from the Clerk dashboard).
const localization = {
  signIn: { start: { title: 'Log in to Affidraw', subtitle: 'Welcome back! Pick up where you left off.' } },
  signUp: { start: { title: 'Create your Affidraw account', subtitle: 'It takes a minute. You must be 18 or older to enter draws.' } },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const page = <div className="min-h-dvh bg-surface"><div className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-5 py-6">{children}</div></div>;
  // Clerk only loads on the auth screens; the rest of the app runs on the Affidraw session cookie.
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ClerkProvider localization={localization}>{page}</ClerkProvider> : page;
}
