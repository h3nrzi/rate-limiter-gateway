import { Module } from "@nestjs/common";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { RateLimiterModule } from "./rate-limiter/rate-limiter.module";
import { RulesModule } from "./rules/rules.module";

@Module({
  imports: [RulesModule, RateLimiterModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
