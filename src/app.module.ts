import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import databaseConfig from "./config/database.config";
import redisConfig from "./config/redis.config";
import { GatewayModule } from "./gateway/gateway.module";
import { RateLimiterModule } from "./rate-limiter/rate-limiter.module";
import { RulesModule } from "./rules/rules.module";

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig],
      envFilePath: [".env.local", ".env"],
    }),

    // Database connection
    TypeOrmModule.forRootAsync({
      useFactory: (configService) => ({
        ...configService.get("database"),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        autoLoadEntities: true,
      }),
      inject: [ConfigModule],
    }),

    // Feature modules
    RulesModule,
    RateLimiterModule,
    GatewayModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limiting guard (optional - can also apply per controller)
    // {
    //   provide: APP_GUARD,
    //   useClass: RateLimiterGuard,
    // },
  ],
})
export class AppModule {}
