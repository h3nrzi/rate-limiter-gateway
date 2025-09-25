export interface RateLimitStorage {
  increment: (key: string, ttl: number) => Promise<number>;
  get: (key: string) => Promise<number | null>;
  reset: (key: string) => Promise<void>;
}
