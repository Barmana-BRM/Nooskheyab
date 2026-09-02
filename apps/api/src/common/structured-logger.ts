import { Injectable, type LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnvironment } from '@pharmacy-mvp/config';

@Injectable()
export class StructuredLogger implements LoggerService {
  private context = 'application';

  private readonly environment: AppEnvironment;

  constructor(config: ConfigService<AppEnvironment, true>) {
    this.environment = config.getAll();
  }

  setContext(context: string): void {
    this.context = context;
  }

  log(message: unknown, context?: string): void {
    this.write('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    if (this.environment.LOG_LEVEL === 'debug' || this.environment.LOG_LEVEL === 'trace') {
      this.write('debug', message, context);
    }
  }

  verbose(message: unknown, context?: string): void {
    if (this.environment.LOG_LEVEL === 'trace') this.write('trace', message, context);
  }

  private write(level: string, message: unknown, context?: string, trace?: string): void {
    const entry: Record<string, unknown> = {
      level,
      timestamp: new Date().toISOString(),
      service: 'pharmacy-prescription-api',
      environment: this.environment.APP_ENV,
      context: context ?? this.context,
      message: typeof message === 'string' ? message : 'structured event',
    };
    if (trace && this.environment.NODE_ENV !== 'production') entry.trace = trace;
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  }
}
