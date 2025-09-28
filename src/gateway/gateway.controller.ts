import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";

import { RateLimit } from "../rate-limiter/decorators/rate-limit.decorator";
import { SkipRateLimit } from "../rate-limiter/decorators/skip-rate-limit.decorator";
import { RateLimiterGuard } from "../rate-limiter/guards/rate-limiter.guard";

@Controller("api")
@UseGuards(RateLimiterGuard) // Apply rate limiting to all endpoints
export class GatewayController {
  // === TESTING ENDPOINTS ===

  @Post("test-rate-limit")
  @RateLimit({ requests: 3, window: "1m" }) // Very strict for easy testing
  async testRateLimit(@Body() data: any, @Headers("user-id") userId?: string) {
    return {
      success: true,
      message: `Request processed successfully!`,
      requestData: data,
      userId: userId ?? "anonymous",
      timestamp: new Date().toISOString(),
      tip: "Try making 4+ requests within a minute to test rate limiting!",
    };
  }

  // No @RateLimit decorator = unlimited access
  @Get("test-unlimited")
  async testUnlimited() {
    return {
      success: true,
      message: "This endpoint has no rate limiting",
      timestamp: new Date().toISOString(),
    };
  }

  // === DIFFERENT RATE LIMITS BY USE CASE ===

  @Post("upload")
  @RateLimit({ requests: 10, window: "1m" }) // 10 uploads per minute
  async uploadFile(@Body() uploadData: any) {
    // Simulate file processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      message: "File uploaded successfully",
      fileId: `file_${Date.now()}`,
      size: uploadData.size ?? "unknown",
      timestamp: new Date().toISOString(),
    };
  }

  @Post("comment")
  @RateLimit({ requests: 50, window: "1h" }) // 50 comments per hour
  async createComment(@Body() commentData: any) {
    return {
      success: true,
      message: "Comment posted successfully",
      commentId: `comment_${Date.now()}`,
      content: commentData.text?.substring(0, 100) + "...",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("search")
  @RateLimit({ requests: 1000, window: "1h" }) // 1000 searches per hour
  async search(@Body() query: any) {
    return {
      success: true,
      query: query.q ?? "empty",
      results: [
        { id: 1, title: "Sample Result 1", score: 0.95 },
        { id: 2, title: "Sample Result 2", score: 0.87 },
        { id: 3, title: "Sample Result 3", score: 0.76 },
      ],
      totalCount: 3,
      timestamp: new Date().toISOString(),
    };
  }

  // === DIFFERENT IDENTIFICATION METHODS ===

  @Post("contact")
  @RateLimit({
    requests: 5,
    window: "1d",
    identifier: "ip", // Rate limit by IP (no login required)
  })
  async submitContactForm(@Body() contactData: any) {
    return {
      success: true,
      message: "Thank you! We will get back to you within 24 hours.",
      ticketId: `ticket_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  }

  @Get("user-profile")
  @RateLimit({
    requests: 100,
    window: "1h",
    identifier: "user-id", // Rate limit by user ID
  })
  async getUserProfile(@Headers("user-id") userId: string) {
    if (!userId) {
      return { error: "user-id header required" };
    }

    return {
      success: true,
      userId,
      profile: {
        name: `User ${userId}`,
        email: `user${userId}@example.com`,
        joinDate: "2024-01-01",
        lastActive: new Date().toISOString(),
      },
    };
  }

  @Get("api-data/:id")
  @RateLimit({
    requests: 1000,
    window: "1h",
    identifier: "api-key", // Rate limit by API key
  })
  async getApiData(
    @Param("id") id: string,
    @Headers("x-api-key") apiKey?: string,
  ) {
    return {
      success: true,
      id,
      apiKey: apiKey ?? "none provided",
      data: {
        timestamp: new Date().toISOString(),
        randomValue: Math.random() * 1000,
        status: "active",
      },
    };
  }

  // === NO RATE LIMITING ===

  @Get("health")
  @SkipRateLimit() // Health checks should never be limited
  getHealth() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        total:
          Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
      },
    };
  }

  @Get("version")
  @SkipRateLimit()
  getVersion() {
    return {
      name: "Rate Limiter Gateway",
      version: "1.0.0",
      buildDate: "2024-09-28",
      environment: process.env.NODE_ENV ?? "development",
    };
  }

  // === DIFFERENT HTTP METHODS ===

  @Get("posts")
  @RateLimit({ requests: 500, window: "1h" }) // Reading is cheaper
  async getPosts() {
    return {
      success: true,
      posts: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Post ${i + 1}`,
        excerpt: `This is a sample post excerpt ${i + 1}...`,
        author: `Author ${i + 1}`,
        publishedAt: new Date().toISOString(),
      })),
    };
  }

  @Post("posts")
  @RateLimit({ requests: 20, window: "1h" }) // Writing is more expensive
  async createPost(@Body() postData: any) {
    return {
      success: true,
      message: "Post created successfully",
      post: {
        id: `post_${Date.now()}`,
        title: postData.title ?? "Untitled",
        content: postData.content ?? "No content",
        publishedAt: new Date().toISOString(),
      },
    };
  }

  @Put("posts/:id")
  @RateLimit({ requests: 30, window: "1h" }) // Updates are medium cost
  async updatePost(@Param("id") id: string, @Body() updateData: any) {
    return {
      success: true,
      message: "Post updated successfully",
      postId: id,
      updatedFields: Object.keys(updateData),
      timestamp: new Date().toISOString(),
    };
  }
}
