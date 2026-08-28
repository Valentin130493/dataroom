import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ExpressAdapter } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express, { Express } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { Env } from './config/env';

declare global {
  interface BigInt {
    toJSON(): number;
  }
}

BigInt.prototype.toJSON = function toJSON(this: bigint): number {
  return Number(this);
};

export interface CreatedApp {
  app: INestApplication;
  server: Express;
  config: ConfigService<Env, true>;
}

export async function createApp(): Promise<CreatedApp> {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  const config = app.get(ConfigService<Env, true>);

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({
    origin: config.get('CORS_ORIGINS', { infer: true }),
    credentials: true,
  });

  return { app, server, config };
}
