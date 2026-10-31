import { LogoMark } from '@/components/Logo';

/** Placeholder shown while a redirect-based sign-in completes. */
export default function Finishing() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center" role="status" aria-live="polite">
      <LogoMark size={40} />
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-primary" aria-hidden />
      <p className="text-body text-muted">Signing you in…</p>
    </div>
  );
}
