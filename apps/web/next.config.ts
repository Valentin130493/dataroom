import type { NextConfig } from 'next';

const DEV_API_ORIGIN = 'http://localhost:4000';

function resolveApiOrigin(): string {
  const configured = process.env.API_ORIGIN?.trim();

  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (process.env.VERCEL) {
    throw new Error(
      'API_ORIGIN is required on Vercel: it is the origin the /api/* rewrite proxies to.',
    );
  }

  return DEV_API_ORIGIN;
}

const nextConfig: NextConfig = {
  transpilePackages: ['@dataroom/shared'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${resolveApiOrigin()}/:path*` }];
  },
};

export default nextConfig;
