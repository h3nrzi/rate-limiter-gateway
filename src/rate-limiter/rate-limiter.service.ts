import { Injectable, Logger } from "@nestjs/common";
import { RulesService } from "../rules/rules.service";
import { RateLimitResult } from "./interfaces/rate-limit-result.interface";
import { RedisStorageService } from "./services/redis-storage.service";
import { TimeUtil } from "./utils/time.util";

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);

  constructor(
    private readonly redisStorage: RedisStorageService,
    private readonly rulesService: RulesService,
  ) {}

  // THE MAIN FUNCTION: Check if a request should be rate limited
  // This is where Redis (fast counts) meets PostgreSQL (persistent rules)!
  async checkRateLimit(
    userId: string,
    endpoint: string,
    method: string = "POST",
  ): Promise<RateLimitResult> {
    try {
      // Step 1: Get rule from PostgreSQL cache (FAST - from memory)
      const rule = this.rulesService.getRuleFromCache(endpoint, method);

      // No rule = no limit
      if (!rule) {
        return {
          allowed: true,
          totalHits: 0,
          remainingRequests: Infinity,
          resetTime: new Date(Date.now() + 60000), // 1 minute from now
        };
      }

      // Step 2: Calculate time window
      const windowSeconds = TimeUtil.parseTimeWindow(rule.window);
      const windowStart = TimeUtil.getWindowStartTime(windowSeconds, "fixed");

      // Step 3: Generate Redis key
      const redisKey = this.redisStorage.generateKey(
        userId,
        endpoint,
        windowStart,
      );

      // Step 4: Increment count in Redis (FAST - atomic operation)
      const currentCount = await this.redisStorage.increment(
        redisKey,
        windowSeconds,
      );

      // Step 5: Check if limit exceeded
      const allowed = currentCount <= rule.requests;
      const remainingRequests = Math.max(0, rule.requests - currentCount);
      const resetTime = new Date((windowStart + windowSeconds) * 1000);

      const result: RateLimitResult = {
        allowed,
        totalHits: currentCount,
        remainingRequests,
        resetTime,
        retryAfter: allowed
          ? undefined
          : Math.ceil((resetTime.getTime() - Date.now()) / 1000),
      };

      if (!allowed) {
        this.logger.warn(
          `Rate limit exceeded for ${userId} on ${endpoint}: ${currentCount}/${rule.requests} in ${rule.window}`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error("Rate limit check failed:", error);

      // FAIL-OPEN: If our system breaks, allow the request
      // In production, you might want FAIL-CLOSED for security-critical APIs
      return {
        allowed: true,
        totalHits: 0,
        remainingRequests: Infinity,
        resetTime: new Date(),
      };
    }
  }
}
