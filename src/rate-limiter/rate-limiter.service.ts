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

  // ====== RATE LIMITING CORE ======

  // Main entry point: checks if user can make request to endpoint
  // Flow: Rule lookup → Time window calc → Redis increment → Decision
  async checkRateLimit(
    userId: string,
    endpoint: string,
    method = "POST",
  ): Promise<RateLimitResult> {
    try {
      // 1. Get rate limit rule from memory cache (fast)
      const rule = this.rulesService.getRuleFromCache(endpoint, method);

      // No rule configured = unlimited access
      if (!rule) {
        return this.createUnlimitedResult();
      }

      // 2. Calculate time window and Redis key
      const { redisKey, windowSeconds, resetTime } = this.prepareRateLimitData(
        userId,
        endpoint,
        rule.window,
      );

      // 3. Atomically increment counter in Redis
      const currentCount = await this.redisStorage.increment(
        redisKey,
        windowSeconds,
      );

      // 4. Build response with allow/deny decision
      const result = this.buildRateLimitResult(
        currentCount,
        rule.requests,
        resetTime,
      );

      if (!result.allowed) {
        this.logger.warn(
          `Rate limit exceeded: ${userId} on ${endpoint} (${currentCount}/${rule.requests})`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error("Rate limit check failed:", error);
      // Fail-open: allow request if system is broken
      return this.createFailOpenResult();
    }
  }

  // ====== HELPER METHODS ======

  // Returns unlimited access when no rate limit rule exists
  private createUnlimitedResult(): RateLimitResult {
    return {
      allowed: true,
      totalHits: 0,
      remainingRequests: Infinity,
      resetTime: new Date(Date.now() + 60000), // Arbitrary future time
    };
  }

  // Calculates time window boundaries and Redis storage key
  // Fixed window: aligns to boundaries (e.g., :00, :60, :120 for 60s windows)
  private prepareRateLimitData(
    userId: string,
    endpoint: string,
    window: string,
  ) {
    const windowSeconds = TimeUtil.parseTimeWindow(window); // "5m" → 300 seconds
    const windowStart = TimeUtil.getWindowStartTime(windowSeconds, "fixed"); // Align to boundary
    const redisKey = this.redisStorage.generateKey(
      userId,
      endpoint,
      windowStart,
    ); // "rate_limit:user123:/api/data:1672531200"
    const resetTime = new Date((windowStart + windowSeconds) * 1000); // When window resets

    return { redisKey, windowSeconds, resetTime };
  }

  // Builds the final rate limit decision with all metadata
  private buildRateLimitResult(
    currentCount: number,
    limit: number,
    resetTime: Date,
  ): RateLimitResult {
    const allowed = currentCount <= limit; // Still within limit?
    const remainingRequests = Math.max(0, limit - currentCount); // How many left?

    return {
      allowed,
      totalHits: currentCount, // Current request count in window
      remainingRequests,
      resetTime, // When the window resets
      retryAfter: allowed
        ? undefined
        : Math.ceil((resetTime.getTime() - Date.now()) / 1000), // Seconds until reset
    };
  }

  // Fail-open strategy: allow requests when rate limiter fails
  // Alternative: fail-closed (deny all) for security-critical endpoints
  private createFailOpenResult(): RateLimitResult {
    return {
      allowed: true,
      totalHits: 0,
      remainingRequests: Infinity,
      resetTime: new Date(),
    };
  }
}
