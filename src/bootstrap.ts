import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { requestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { createValidationPipe } from './common/pipes/validation.pipe';
import { AppConfigService } from './config/app-config.service';

/**
 * Shared HTTP surface for production and e2e: correlation, access logs,
 * validation, error contract, and OpenAPI.
 */
export function configureApp(app: INestApplication): void {
  const appConfig = app.get(AppConfigService);

  app.use(requestIdMiddleware);
  app.use(requestLoggingMiddleware);
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Contract Repayment API')
    .setDescription(
      'Device contract repayment calculations: 12 / 24 / 36-month offerings at 6.5% interest.',
    )
    .setVersion(appConfig.version)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });
}
