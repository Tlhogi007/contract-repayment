import { ValidationPipe } from '@nestjs/common';

/**
 * Fail closed on request shape.
 * No implicit type coercion — numeric fields must opt in with `@Type(() => Number)`.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
}
