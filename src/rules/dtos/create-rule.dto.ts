import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  Matches,
  IsEnum,
  IsBoolean,
} from "class-validator";

export class CreateRateLimitRuleDto {
  @IsString()
  name: string;

  @IsString()
  endpoint: string;

  @IsString()
  @IsOptional()
  method?: string = "*";

  @IsNumber()
  @Min(1)
  @Max(1_000_000)
  requests: number;

  @IsString()
  @Matches(/^\d+[smhd]$/, {
    message: 'Window must be in format like "1m", "1h", "1d"',
  })
  window: string;

  @IsEnum(["user-id", "ip", "api-key"])
  @IsOptional()
  identifier?: string = "user-id";

  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;

  @IsOptional()
  metadata?: Record<string, any>;
}
