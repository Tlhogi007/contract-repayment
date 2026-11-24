export const TERM_MONTHS = [12, 24, 36] as const;

export type TermMonths = (typeof TERM_MONTHS)[number];
