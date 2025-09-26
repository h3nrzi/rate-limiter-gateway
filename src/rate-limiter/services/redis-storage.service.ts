import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis, { RedisOptions } from "ioredis";

import { RateLimitStorage } from "../interfaces/rate-limit-storage.interface";

@Injectable()
export class RedisStorageService
  implements RateLimitStorage, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisStorageService.name);
  private redis!: Redis;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisConfig = this.configService.get<RedisOptions>("redis");

    this.redis = new Redis({
      ...redisConfig,
      lazyConnect: true,
      // retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    this.redis.on("connect", () => {
      this.logger.log("Connected to Redis");
      this.isConnected = true;
    });

    this.redis.on("error", (err) => {
      this.logger.error(`Failed to connected to redis:`, err);
      this.isConnected = false;
    });

    try {
      await this.redis.connect();
    } catch (err) {
      this.logger.error(`Failed to connect to redis:`, err);
    }
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }

  // Increment request count for a user+endpoint combination
  // This is the CORE of our rate limiting - every request calls this!
  async increment(key: string, ttl: number): Promise<number> {
    if (!this.isConnected) {
      throw new Error("Redis not connected - failing closed");
    }

    try {
      // Use Redis pipeline for atomic operation
      const pipeline = this.redis.pipeline();

      // Increment the counter
      pipeline.incr(key);

      // Set expiration (only if key is new)
      pipeline.expire(key, ttl);

      const results = await pipeline.exec();

      if (!results || results.some(([err]) => err)) {
        throw new Error("Redis pipeline execution failed");
      }

      // Return the new count
      return results[0][1] as number;
    } catch (error) {
      this.logger.error(`Failed to increment key ${key}`, error);
      throw error;
    }
  }

  // Get current request count
  async get(key: string): Promise<number | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const count = await this.redis.get(key);
      return count ? parseInt(count, 10) : null;
    } catch (error) {
      this.logger.error(`Failed to get key ${key}`, error);
      return null;
    }
  }

  // Reset request count for a user (admin function)
  async reset(key: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to reset key ${key}:`, error);
      throw error;
    }
  }

  // Generate Redis key for rate limiting
  // This is how we organize our data in Redis!
  generateKey(userId: string, endpoint: string, windowStart: number): string {
    return `rate_limit:${userId}:${endpoint}:${windowStart}`;
  }

  // Health check for Redis connection
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }
}
