import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  ValidationPipe,
} from "@nestjs/common";

import { SkipRateLimit } from "../rate-limiter/decorators/skip-rate-limit.decorator";

import { CreateRateLimitRuleDto } from "./dtos/create-rule.dto";
import { RulesService } from "./rules.service";

@Controller("admin/rules")
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get()
  @SkipRateLimit()
  @HttpCode(HttpStatus.OK)
  async getAllRules() {
    const rules = await this.rulesService.getAllRules();
    return {
      success: true,
      count: rules.length,
      data: { rules },
    };
  }

  @Post()
  @SkipRateLimit()
  @HttpCode(HttpStatus.CREATED)
  async createRule(
    @Body(ValidationPipe) createRuleDto: CreateRateLimitRuleDto,
  ) {
    const rule = this.rulesService.createRule(createRuleDto);
    return {
      success: true,
      message: "Rate limit rule created successfully",
      data: { rule },
    };
  }

  @Put(":id")
  @SkipRateLimit()
  @HttpCode(HttpStatus.OK)
  async updateRule(
    @Param("id") id: string,
    @Body(ValidationPipe) updateRuleDto: Partial<CreateRateLimitRuleDto>,
  ) {
    const rule = await this.rulesService.updateRule(id, updateRuleDto);
    if (!rule) throw new NotFoundException("Rate limit rule not found");
    return {
      success: true,
      message: "Rate limit rule updated successfully",
      data: { rule },
    };
  }

  @Delete(":id")
  @SkipRateLimit()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(@Param(":id") id: string) {
    const deleted = await this.rulesService.deleteRule(id);
    if (!deleted) throw new NotFoundException("Rate limit rule not found");
  }

  @Post("sync")
  @SkipRateLimit()
  async forceSyncRules() {
    await this.rulesService.syncRulesToCache();
    return {
      success: true,
      message: "Rules cache synchronized successfully",
    };
  }
}
