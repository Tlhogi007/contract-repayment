import {
  Global,
  Module,
  OnModuleDestroy,
  type DynamicModule,
} from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import {
  createErrorReporter,
  ERROR_REPORTER,
  type ErrorReporter,
} from './error-reporter';
import { HttpMetricsService } from './http-metrics.service';
import { shutdownTelemetry } from './telemetry';

@Global()
@Module({})
export class ObservabilityModule implements OnModuleDestroy {
  static forRoot(): DynamicModule {
    return {
      module: ObservabilityModule,
      providers: [
        HttpMetricsService,
        {
          provide: ERROR_REPORTER,
          inject: [AppConfigService],
          useFactory: (config: AppConfigService): ErrorReporter =>
            createErrorReporter({
              sentryDsn: config.sentryDsn,
              environment: config.nodeEnv,
              release: `${config.otelServiceName}@${config.version}`,
            }),
        },
      ],
      exports: [HttpMetricsService, ERROR_REPORTER],
    };
  }

  async onModuleDestroy(): Promise<void> {
    // OTel globals cannot be re-registered in the same Jest worker.
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    await shutdownTelemetry();
  }
}
