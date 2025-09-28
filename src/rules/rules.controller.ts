import { Controller } from "@nestjs/common";
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  NotFoundException,
} from "@nestjs/common";

import { SkipRateLimit } from "../rate-limiter/decorators/skip-rate-limit.decorator";

import { CreateRateLimitRuleDto } from "./dtos/create-rule.dto";
import { RulesService } from "./rules.service";

@Controller("rules")
export class RulesController {}
