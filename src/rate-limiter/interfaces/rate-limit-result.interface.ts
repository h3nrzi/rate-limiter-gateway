export interface RateLimitResult {
  allowed: boolean;
  totalHits: number;
  remainingRequests: number;
  resetTime: Date;
  retryAfter?: number; // seconds
}
