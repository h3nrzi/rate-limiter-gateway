export interface RateLimitRule {
  requests: number;
  window: string; // "1m", "1h", "1d"
  identifier?: "user-id" | "ip" | "api-key";
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}
