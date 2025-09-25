# Project Structure

rate-limiter-gateway/
├── src/
│ ├── app.module.ts
│ ├── main.ts
│ ├── config/
│ │ ├── database.config.ts
│ │ └── redis.config.ts
│ ├── rate-limiter/
│ │ ├── rate-limiter.module.ts
│ │ ├── rate-limiter.service.ts
│ │ ├── rate-limiter.guard.ts
│ │ └── interfaces/
│ │ └── rate-limit-rule.interface.ts
│ ├── rules/
│ │ ├── rules.module.ts
│ │ ├── rules.controller.ts
│ │ ├── rules.service.ts
│ │ └── entities/
│ │ └── rule.entity.ts
│ ├── gateway/
│ │ ├── gateway.module.ts
│ │ ├── gateway.controller.ts
│ │ └── gateway.service.ts
│ └── common/
│ ├── decorators/
│ │ └── rate-limit.decorator.ts
│ └── interceptors/
│ └── logging.interceptor.ts
├── docker/
│ ├── Dockerfile
│ └── docker-compose.yml
├── k8s/
│ ├── deployment.yaml
│ ├── service.yaml
│ ├── configmap.yaml
│ └── redis-deployment.yaml
├── package.json
└── .env

# Dependencies

npm install @nestjs/redis @nestjs/typeorm typeorm pg redis ioredis
npm install @nestjs/config @nestjs/common class-validator class-transformer
npm install --save-dev @types/redis
