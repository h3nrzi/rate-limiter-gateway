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

  // === CONNECTION MANAGEMENT ===
  async onModuleInit() {
    const redisConfig = this.configService.get<RedisOptions>("redis");

    this.redis = new Redis({
      ...redisConfig,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      // retryDelayOnFailover: 100,
    });

    this.setupEventHandlers();

    try {
      await this.redis.connect();
    } catch (err) {
      this.logger.error("Failed to connect to Redis:", err);
    }
  }

  onModuleDestroy() {
    this.redis?.disconnect();
  }

  private setupEventHandlers() {
    this.redis.on("connect", () => {
      this.logger.log("Connected to Redis");
      this.isConnected = true;
    });

    this.redis.on("error", (err) => {
      this.logger.error("Redis connection error:", err);
      this.isConnected = false;
    });
  }

  // === RATE LIMITING OPERATIONS ===
  async increment(key: string, ttl: number): Promise<number> {
    this.ensureConnected();

    try {
      const pipeline = this.redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, ttl);

      const results = await pipeline.exec();

      if (!results || results.some(([err]) => err)) {
        throw new Error("Redis pipeline execution failed");
      }

      return results[0][1] as number;
    } catch (error) {
      this.logger.error(`Failed to increment key ${key}`, error);
      throw error;
    }
  }

  async get(key: string): Promise<number | null> {
    if (!this.isConnected) return null;

    try {
      const count = await this.redis.get(key);
      return count ? parseInt(count, 10) : null;
    } catch (error) {
      this.logger.error(`Failed to get key ${key}`, error);
      return null;
    }
  }

  async reset(key: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to reset key ${key}`, error);
      throw error;
    }
  }

  // === UTILITIES ===
  generateKey(userId: string, endpoint: string, windowStart: number): string {
    return `rate_limit:${userId}:${endpoint}:${windowStart}`;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error("Redis not connected - failing closed");
    }
  }
}
