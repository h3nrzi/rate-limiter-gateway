import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { RateLimiterService } from "./rate-limiter.service";
import { RedisStorageService } from "./services/redis-storage.service";
import { RateLimiterGuard } from "./guards/rate-limiter.guard";

import { RulesModule } from "../rules/rules.module";
import redisConfig from "../config/redis.config";

@Module({})
export class RateLimiterModule {}
