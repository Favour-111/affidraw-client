import Link from 'next/link';
import { Ticket } from 'lucide-react';

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center justify-center rounded-[9px] bg-primary text-white" style={{ width: size, height: size }} aria-hidden>
      <Ticket style={{ width: size * 0.56, height: size * 0.56 }} strokeWidth={2.25} />
    </span>
  );
}

export default function Logo({ href = '/', suffix, inverse, size = 'md' }: { href?: string; suffix?: string; inverse?: boolean; size?: 'md' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <Link href={href} className="inline-flex items-center gap-2" aria-label="Affidraw home">
      {lg ? (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] bg-primary text-white sm:h-[38px] sm:w-[38px] sm:rounded-[9px]" aria-hidden>
          <Ticket className="h-4 w-4 sm:h-[21px] sm:w-[21px]" strokeWidth={2.25} />
        </span>
      ) : <LogoMark />}
      <span className={`${lg ? 'text-[1.0625rem] sm:text-[1.3125rem]' : 'text-[1.125rem]'} font-extrabold tracking-[-0.035em] ${inverse ? 'text-white' : 'text-ink'}`}>affidraw</span>
      {suffix && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-micro font-semibold uppercase text-muted">{suffix}</span>}
    </Link>
  );
}
