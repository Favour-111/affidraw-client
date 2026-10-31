const backend = process.env.BACKEND_URL ?? 'http://localhost:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide the floating Next.js dev-tools badge.
  devIndicators: false,
  // Local-disk upload fallback proxies files through /api; S3 uploads go straight to the bucket.
  experimental: { proxyClientMaxBodySize: '105mb' },
  // Same-origin proxy: the browser only talks to this host, so the HttpOnly session cookie
  // needs no CORS or third-party cookie tricks.
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
export default nextConfig;
