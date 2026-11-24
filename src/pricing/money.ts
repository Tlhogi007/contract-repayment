/**
 * Upper bound for principal cents so option totals stay within SQLite/Prisma Int
 * (signed 32-bit) at the assessment rate and longest term (36 months).
 */
export const MAX_PRINCIPAL_CENTS = 1_000_000_000;
