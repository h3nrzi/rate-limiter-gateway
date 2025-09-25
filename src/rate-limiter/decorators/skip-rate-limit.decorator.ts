import { CustomDecorator, SetMetadata } from "@nestjs/common";

export const SKIP_RATE_LIMIT_KEY = "skip_rate_limit";

/**
 * Decorator to skip rate limiting for specific endpoints
 *
 * @example
 * @SkipRateLimit()
 * @Get("health")
 * healthCheck() { ... }
 */
export const SkipRateLimit = (): CustomDecorator<string> => {
  return SetMetadata(SKIP_RATE_LIMIT_KEY, true);
};
