import type { NextConfig } from 'next';

const DEV_API_ORIGIN = 'http://localhost:4000';

function resolveApiOrigin(): string {
  const configured = process.env.API_ORIGIN?.trim();

  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (process.env.NODE_ENV === 'development') {
    return DEV_API_ORIGIN;
  }

  throw new Error(
    'API_ORIGIN is required for a production build: it is the origin the /api/* rewrite proxies to.',
  );
}

const nextConfig: NextConfig = {
  transpilePackages: ['@dataroom/shared'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${resolveApiOrigin()}/:path*` }];
  },
};

export default nextConfig;
