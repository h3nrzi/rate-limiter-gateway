import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { RateLimitRuleEntity } from "./entities/rule.entity";
import { CreateRateLimitRuleDto } from "./dtos/create-rule.dto";

@Injectable()
export class RulesService implements OnModuleInit {
  private readonly logger = new Logger(RulesService.name);
  private readonly rulesCache = new Map<string, RateLimitRuleEntity>();

  constructor(
    @InjectRepository(RateLimitRuleEntity)
    private readonly rulesRepository: Repository<RateLimitRuleEntity>,
  ) {}

  // === CACHE MANAGEMENT ===
  async onModuleInit() {
    await this.syncRulesToCache();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncRulesToCache() {
    try {
      const rules = await this.rulesRepository.find({
        where: { enabled: true },
      });

      this.rulesCache.clear();
      rules.forEach((rule) => {
        const key = this.generateRuleKey(rule.endpoint, rule.method);
        this.rulesCache.set(key, rule);
      });

      this.logger.log(`Synced ${rules.length} rules to cache`);
    } catch (error) {
      this.logger.error("Failed to sync rules to cache:", error);
    }
  }

  getRuleFromCache(endpoint: string, method = "*"): RateLimitRuleEntity | null {
    return (
      this.rulesCache.get(this.generateRuleKey(endpoint, method)) ||
      this.rulesCache.get(this.generateRuleKey(endpoint, "*")) ||
      null
    );
  }

  // === RULE OPERATIONS ===
  async createRule(dto: CreateRateLimitRuleDto): Promise<RateLimitRuleEntity> {
    const savedRule = await this.rulesRepository.save(
      this.rulesRepository.create(dto),
    );

    if (savedRule.enabled) {
      this.rulesCache.set(
        this.generateRuleKey(savedRule.endpoint, savedRule.method),
        savedRule,
      );
    }

    this.logger.log(`Created rule: ${dto.name}`);
    return savedRule;
  }

  async updateRule(
    id: string,
    updates: Partial<CreateRateLimitRuleDto>,
  ): Promise<RateLimitRuleEntity | null> {
    const existingRule = await this.rulesRepository.findOne({ where: { id } });
    if (!existingRule) return null;

    await this.rulesRepository.update(id, updates);
    const updatedRule = await this.rulesRepository.findOne({ where: { id } });

    if (updatedRule) {
      const key = this.generateRuleKey(
        updatedRule.endpoint,
        updatedRule.method,
      );
      if (updatedRule.enabled) {
        this.rulesCache.set(key, updatedRule);
      } else {
        this.rulesCache.delete(key);
      }
    }

    return updatedRule;
  }

  async deleteRule(id: string): Promise<boolean> {
    const rule = await this.rulesRepository.findOne({ where: { id } });
    if (!rule) return false;

    await this.rulesRepository.remove(rule);
    this.rulesCache.delete(this.generateRuleKey(rule.endpoint, rule.method));
    return true;
  }

  async getAllRules(): Promise<RateLimitRuleEntity[]> {
    return this.rulesRepository.find();
  }

  // === UTILITIES ===
  private generateRuleKey(endpoint: string, method: string): string {
    return `${method}:${endpoint}`;
  }
}
