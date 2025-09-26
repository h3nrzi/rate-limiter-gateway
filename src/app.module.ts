import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { RulesModule } from "./rules/rules.module";

@Module({
  imports: [RulesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
