import { CustomDecorator, SetMetadata } from "@nestjs/common";
import { RateLimitRule } from "../interfaces/rate-limit-rule.interface";

export const RATE_LIMIT_KEY = "rate_limit";

/**
 * Custom decorator for applying rate limits to endpoints
 *
 * @example
 * @RateLimit({ request: 10, window: "1m" })
 * @Post("upload")
 * uploadFile() { ... }
 *
 * @example
 * @RateLimit({ requests: 100, window: "1h", identifier: api-key })
 * @Get("search")
 * search() { ... }
 */
export const RateLimit = (rule: RateLimitRule): CustomDecorator<string> => {
  // validate the rule format
  if (!rule.requests || rule.requests <= 0) {
    throw new Error("Rate limit requests must be a positive number");
  }
  if (!rule.window || rule.window.match(/^\d+[smhd]$/)) {
    throw new Error(
      "Rate limit window must be in format like '1m', '1h', '1d'.",
    );
  }

  // set default values
  const completeRule: RateLimitRule = {
    identifier: "user-id",
    skipSuccessfulRequest: false,
    skipFailedRequests: false,
    ...rule,
  };

  return SetMetadata(RATE_LIMIT_KEY, completeRule);
};
