import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  configureApp(app);

  const { port } = app.get(AppConfigService);
  await app.listen(port);

  Logger.log(`Listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
