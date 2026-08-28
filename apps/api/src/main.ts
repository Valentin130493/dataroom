import { createApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const { app, config } = await createApp();

  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
