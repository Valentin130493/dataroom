import { Express } from 'express';
import { createApp } from './app.setup';

let cached: Promise<Express> | null = null;

async function bootstrap(): Promise<Express> {
  const { app, server } = await createApp();

  await app.init();

  return server;
}

export function getServer(): Promise<Express> {
  cached ??= bootstrap();

  return cached;
}
