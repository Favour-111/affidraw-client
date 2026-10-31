import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

// Geometric, highly legible sans with a full weight range — close in spirit to the Bayse reference.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap', weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: { default: 'Affidraw — Your next big win starts here', template: '%s · Affidraw' },
  description: 'Discover prizes, enter verified draws, track your tickets and watch official results.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#4A943E' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
