import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { RateLimitRuleEntity } from "./entities/rule.entity";
import { CreateRateLimitRuleDto } from "./dtos/create-rule.dto";

@Injectable()
export class RulesService implements OnModuleInit {
  private readonly logger = new Logger(RulesService.name);
  private rulesCache = new Map<string, RateLimitRuleEntity>(); // In-memory cache

  constructor(
    @InjectRepository(RateLimitRuleEntity)
    private rulesRepository: Repository<RateLimitRuleEntity>,
  ) {}

  async onModuleInit() {
    await this.asyncRulesToCache();
  }

  // KEY SYNC FUNCTION: Load rules from PostgreSQL into memory
  // This runs at startup and every 5 minutes
  // WHY? Rules don't change often, but we need them FAST when checking limits
  @Cron(CronExpression.EVERY_5_MINUTES)
  async asyncRulesToCache() {
    try {
      const rules = await this.rulesRepository.find({
        where: { enabled: true },
      });

      // clear and rebuild cache
      this.rulesCache.clear();

      for (const rule of rules) {
        const key = this.generateRuleKey(rule.endpoint, rule.method);
        this.rulesCache.set(key, rule);
      }

      this.logger.log(`Synced ${rules.length} rules to cache`);
    } catch (error) {
      this.logger.error("Failed to sync rules to cache:", error);
    }
  }

  // Get rule for a specific endpoint (FAST - from memory cache)
  // This is called on EVERY request that needs rate limiting
  getRuleFromCache(
    endpoint: string,
    method: string = "*",
  ): RateLimitRuleEntity | null {
    const key = this.generateRuleKey(endpoint, method);
    const fallBackKey = this.generateRuleKey(endpoint, "*");
    return this.rulesCache.get(key) || this.rulesCache.get(fallBackKey) || null;
  }

  // Create new rule (SLOW - writes to PostgreSQL)
  async createRule(dto: CreateRateLimitRuleDto): Promise<RateLimitRuleEntity> {
    const rule = this.rulesRepository.create(dto);
    const savedRule = await this.rulesRepository.save(rule);

    // Immediately update cache
    const key = this.generateRuleKey(savedRule.endpoint, savedRule.method);
    this.rulesCache.set(key, savedRule);

    this.logger.log(`Created new rate limit rule: ${dto.name}`);
    return savedRule;
  }

  // Update existing rule
  async updateRule(
    id: string,
    updates: Partial<CreateRateLimitRuleDto>,
  ): Promise<RateLimitRuleEntity | null> {
    await this.rulesRepository.update(id, updates);
    const updatedRule = await this.rulesRepository.findOne({ where: { id } });

    // Update cache
    if (updatedRule) {
      const key = this.generateRuleKey(
        updatedRule.endpoint,
        updatedRule.method,
      );
      this.rulesCache.set(key, updatedRule);
    }

    return updatedRule;
  }

  // Delete rule
  async deleteRule(id: string): Promise<void> {
    const rule = await this.rulesRepository.findOne({ where: { id } });
    if (rule) {
      await this.rulesRepository.remove(rule);

      // Remove from cache
      const key = this.generateRuleKey(rule.endpoint, rule.method);
      this.rulesCache.delete(key);
    }
  }

  // Get all rules (for admin UI)
  async getAllRules(): Promise<RateLimitRuleEntity[]> {
    return this.rulesRepository.find();
  }

  private generateRuleKey(endpoint: string, method: string): string {
    return `${method}:${endpoint}`;
  }
}
