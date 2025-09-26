import { CustomDecorator, SetMetadata } from "@nestjs/common";

export const SKIP_RATE_LIMIT_KEY = "skip_rate_limit";

export const SkipRateLimit = (): CustomDecorator<string> => {
  return SetMetadata(SKIP_RATE_LIMIT_KEY, true);
};
