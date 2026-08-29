import { execSync } from 'node:child_process';

const DEFAULT_TEST_DATABASE = 'postgresql://postgres:postgres@localhost:55432/dataroom_test';
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', 'postgres'];

function assertDisposable(url: string): void {
  if (process.env.ALLOW_REMOTE_TEST_DB === 'true') {
    return;
  }

  const host = new URL(url).hostname;

  if (!LOCAL_HOSTS.includes(host)) {
    throw new Error(
      `Refusing to run end-to-end tests against "${host}": they truncate every table.\n` +
        'Point TEST_DATABASE_URL at a disposable database, or set ALLOW_REMOTE_TEST_DB=true.',
    );
  }
}

export default function globalSetup(): void {
  const url = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE;

  assertDisposable(url);

  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;
  process.env.NODE_ENV = 'development';
  process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-value';
  process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-value';
  process.env.SUPABASE_URL ??= 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';
  process.env.CORS_ORIGINS ??= 'http://localhost:3000';
  process.env.DISABLE_RATE_LIMIT = 'true';

  execSync('pnpm exec prisma migrate deploy', {
    cwd: `${__dirname}/..`,
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
}
