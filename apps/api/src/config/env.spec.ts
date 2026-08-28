import { validateEnv } from './env';

const BASE = {
  DATABASE_URL: 'postgresql://localhost:5432/dataroom',
  JWT_ACCESS_SECRET: 'access-secret-long-enough',
  JWT_REFRESH_SECRET: 'refresh-secret-long-enough',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
};

describe('validateEnv', () => {
  it('treats an empty optional value as absent', () => {
    const env = validateEnv({ ...BASE, COOKIE_DOMAIN: '', GOOGLE_CALLBACK_URL: '' });

    expect(env.COOKIE_DOMAIN).toBeUndefined();
    expect(env.GOOGLE_CALLBACK_URL).toBeUndefined();
  });

  it('splits CORS_ORIGINS into a trimmed list', () => {
    const env = validateEnv({ ...BASE, CORS_ORIGINS: 'https://a.test, https://b.test ' });

    expect(env.CORS_ORIGINS).toEqual(['https://a.test', 'https://b.test']);
  });

  it('accepts a bare cookie hostname', () => {
    expect(validateEnv({ ...BASE, COOKIE_DOMAIN: 'example.com' }).COOKIE_DOMAIN).toBe('example.com');
  });

  it('reduces a URL to its hostname', () => {
    const env = validateEnv({ ...BASE, COOKIE_DOMAIN: 'https://app.example.com:443/path' });

    expect(env.COOKIE_DOMAIN).toBe('app.example.com');
  });

  it('rejects a cookie domain that is not a hostname', () => {
    expect(() => validateEnv({ ...BASE, COOKIE_DOMAIN: 'not a domain' })).toThrow(
      /bare hostname/,
    );
  });

  it('reports every problem at once', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL[\s\S]*JWT_ACCESS_SECRET/);
  });
});
