import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  console.log('[BOOT] 1. Initializing bootstrap...');
  const logger = new Logger('Bootstrap');
  console.log('[BOOT] 2. NestFactory.create(AppModule)...');
  const app = await NestFactory.create(AppModule);
  console.log('[BOOT] 3. AppModule initialized successfully.');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  console.log(`[BOOT] 4. Listening on port ${port}...`);
  await app.listen(port);
  logger.log(`🚀 Serveur NestJS MaquisSaaS démarré avec succès sur http://localhost:${port}`);
  console.log(`[BOOT] 5. Server ready at http://localhost:${port}`);
}

bootstrap().catch(err => {
  console.error('[BOOT ERROR]', err);
  process.exit(1);
});
