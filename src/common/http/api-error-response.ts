/**
 * Stable client/log error contract for every failure path.
 * `message` is a string or string[] so validation arrays stay useful.
 */
export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
  requestId?: string;
}
