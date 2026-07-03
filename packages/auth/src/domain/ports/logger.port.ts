/**
 * Framework-agnostic logger port so application-layer use cases can log
 * without depending on NestJS. Any logger with this shape (including
 * NestJS `Logger`) satisfies it structurally.
 */
export interface ILogger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/** Default logger: discards everything. */
export class NoopLogger implements ILogger {
  log(): void {}
  warn(): void {}
  error(): void {}
}
