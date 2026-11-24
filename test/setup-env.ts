import { execSync } from 'node:child_process';

process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3000';
process.env.DATABASE_URL ??= 'file:./prisma/test.db';
process.env.JWT_SECRET ??= 'e2e-test-jwt-secret-32chars-min!!';
process.env.JWT_EXPIRES_IN ??= '1h';

execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: process.env,
});
