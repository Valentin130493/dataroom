import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import request, { Response } from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { STORAGE_PROVIDER } from '../src/storage/storage.provider';
import { FakeStorage } from './fake-storage';

export interface Harness {
  app: INestApplication;
  prisma: PrismaService;
  storage: FakeStorage;
  close: () => Promise<void>;
  reset: () => Promise<void>;
  signUp: (email: string) => Promise<Actor>;
  anonymous: () => Actor;
}

export interface Actor {
  email: string;
  cookies: string[];
  get: (path: string, shareToken?: string) => request.Test;
  post: (path: string, body?: unknown, shareToken?: string) => request.Test;
  patch: (path: string, body?: unknown) => request.Test;
  delete: (path: string) => request.Test;
}

const TABLES = [
  'ShareRecipient',
  'Share',
  'Upload',
  'FileVersion',
  'Node',
  'DataRoom',
  'RefreshToken',
  'OAuthAccount',
  'User',
];

export async function createHarness(): Promise<Harness> {
  const storage = new FakeStorage();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(STORAGE_PROVIDER)
    .useValue(storage)
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleRef.createNestApplication();

  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();

  const prisma = app.get(PrismaService);
  const server = () => app.getHttpServer() as App;

  const actorFor = (email: string, cookies: string[]): Actor => ({
    email,
    cookies,
    get: (path, shareToken) => withAuth(request(server()).get(path), cookies, shareToken),
    post: (path, body, shareToken) =>
      withAuth(request(server()).post(path).send(body ?? {}), cookies, shareToken),
    patch: (path, body) => withAuth(request(server()).patch(path).send(body ?? {}), cookies),
    delete: (path) => withAuth(request(server()).delete(path), cookies),
  });

  return {
    app,
    prisma,
    storage,
    close: () => app.close(),
    reset: async () => {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(', ')} CASCADE`,
      );
      storage.objects.clear();
      storage.removed.length = 0;
    },
    signUp: async (email) => {
      const response = await request(server())
        .post('/auth/signup')
        .send({ email, password: 'password123', name: email })
        .expect(201);

      return actorFor(email, cookiesOf(response));
    },
    anonymous: () => actorFor('anonymous', []),
  };
}

function withAuth(test: request.Test, cookies: string[], shareToken?: string): request.Test {
  if (cookies.length > 0) {
    test.set('Cookie', cookies);
  }

  if (shareToken) {
    test.set('x-share-token', shareToken);
  }

  return test;
}

function cookiesOf(response: Response): string[] {
  const header = response.headers['set-cookie'];

  return Array.isArray(header) ? header.map((cookie) => cookie.split(';')[0] as string) : [];
}
