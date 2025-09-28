import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";

import { RATE_LIMIT_KEY } from "../decorators/rate-limit.decorator";
import { SKIP_RATE_LIMIT_KEY } from "../decorators/skip-rate-limit.decorator";
import { RateLimitResult } from "../interfaces/rate-limit-result.interface";
import { RateLimitRule } from "../interfaces/rate-limit-rule.interface";
import { RateLimiterService } from "../rate-limiter.service";

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly logger = new Logger(RateLimiterGuard.name);

  constructor(
    private readonly rateLimiterService: RateLimiterService,
    private readonly reflector: Reflector,
  ) {}

  // ====== GUARD EXECUTION ======

  // Main entry point: validates request against rate limit rules
  // Flow: Skip check → Rule lookup → Extract info → Rate limit → Headers → Decision
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check if rate limiting should be skipped
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>(
      SKIP_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipRateLimit) {
      this.logger.debug("Rate limiting skipped for this endpoint");
      return true;
    }

    // 2. Get rate limit rule from decorator (no decorator = no rate limiting)
    const rateLimitRule = this.reflector.getAllAndOverride<RateLimitRule>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!rateLimitRule) {
      this.logger.debug("No rate limit rule found, allowing request");
      return true;
    }

    // 3. Extract request information and check rate limit
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { userId, endpoint, method } = this.extractRequestInfo(
      request,
      rateLimitRule,
    );
    this.logger.debug(
      `Rate limit check: ${userId} → ${method} ${endpoint} (${rateLimitRule.requests}/${rateLimitRule.window})`,
    );

    try {
      // 4. Check rate limit via service
      const result = await this.rateLimiterService.checkRateLimit(
        userId,
        endpoint,
        method,
      );

      // 5. Add standard rate limit headers
      this.addRateLimitHeaders(response, result, rateLimitRule);

      // 6. Reject if limit exceeded
      if (!result.allowed) {
        this.logger.warn(
          `Rate limit exceeded: ${userId} on ${endpoint} (${result.totalHits}/${rateLimitRule.requests})`,
        );
        throw new HttpException(
          {
            message: "Rate limit exceeded",
            error: "Too Many Requests",
            statusCode: 429,
            retryAfter: result.retryAfter,
            limit: rateLimitRule.requests,
            remaining: result.remainingRequests,
            resetTime: result.resetTime.toISOString(),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      this.logger.debug(
        `Rate limit passed: ${userId} (${result.totalHits}/${rateLimitRule.requests})`,
      );
      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;

      // Fail-open: allow request if system is broken
      this.logger.error("Rate limiter system error:", error);
      return true;
    }
  }

  // ====== HELPER METHODS ======

  // Extract user identifier, endpoint, and method from request
  private extractRequestInfo(request: Request, rule: RateLimitRule) {
    let userId: string;

    switch (rule.identifier) {
      case "user-id":
        userId = this.getUserId(request);
        break;
      case "ip":
        userId = this.getClientIP(request);
        break;
      case "api-key":
        userId = this.getApiKey(request);
        break;
      default:
        userId = this.getUserId(request);
    }

    return {
      userId,
      endpoint: request.route?.path ?? request.path,
      method: request.method,
    };
  }

  // Get user ID from request (headers → JWT → query → IP fallback)
  private getUserId(request: Request): string {
    const headerUserId = request.headers["user-id"] as string;
    if (headerUserId) return headerUserId;

    const user = (request as any).user; // JWT middleware sets req.user
    if (user?.id) return user.id.toString();
    if (user?.sub) return user.sub.toString();

    const queryUserId = request.query.userId as string;
    if (queryUserId) return queryUserId;

    return this.getClientIP(request);
  }

  // Get real client IP address (handles proxies)
  private getClientIP(request: Request): string {
    const forwarded = request.headers["x-forwarded-for"] as string;
    if (forwarded) return forwarded.split(",")[0].trim();

    return (
      (request.headers["x-real-ip"] as string) ??
      request.connection?.remoteAddress ??
      request.socket.remoteAddress ??
      "unknown"
    );
  }

  // Get API key from headers or query parameters
  private getApiKey(request: Request): string {
    const apiKey =
      ((request.headers["x-api-key"] as string) ||
        request.headers["authorization"]?.replace("Bearer ", "")) ??
      (request.query.apiKey as string);

    return apiKey || this.getClientIP(request);
  }

  // Add standard rate limit headers to response
  private addRateLimitHeaders(
    response: Response,
    result: RateLimitResult,
    rule: RateLimitRule,
  ) {
    response.set({
      "X-RateLimit-Limit": rule.requests.toString(),
      "X-RateLimit-Remaining": result.remainingRequests.toString(),
      "X-RateLimit-Reset": Math.floor(
        result.resetTime.getTime() / 1000,
      ).toString(),
      "X-RateLimit-Window": rule.window,
    });

    if (result.retryAfter)
      response.set({ "Retry-After": result.retryAfter.toString() });
  }
}
