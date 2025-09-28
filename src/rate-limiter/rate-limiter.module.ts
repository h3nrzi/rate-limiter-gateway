import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import redisConfig from "../config/redis.config";
import { RulesModule } from "../rules/rules.module";

import { RateLimiterGuard } from "./guards/rate-limiter.guard";
import { RateLimiterService } from "./rate-limiter.service";
import { RedisStorageService } from "./services/redis-storage.service";

@Module({
  imports: [ConfigModule.forFeature(redisConfig), RulesModule],
  providers: [RateLimiterService, RedisStorageService, RateLimiterGuard],
  exports: [RateLimiterService, RateLimiterGuard],
})
export class RateLimiterModule {}
