# Rate Limiting

The package defines a `RateLimitError` (429) but does not include a rate limiter directly. We recommend `@nestjs/throttler`.

## Installation

```bash
pnpm add @nestjs/throttler
```

## Basic setup

```typescript
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,     // 1 minute window
      limit: 20,      // 20 requests per window
    }]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
```

## Custom rate limits by endpoint

```typescript
import { SkipThrottle, Throttle } from "@nestjs/throttler";

@SkipThrottle() // no rate limit
@Get("health")
health() { ... }

@Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 req/min
@Post("login")
login() { ... }
```

## Rate limiting auth endpoints

Since all auth endpoints are under `/auth`, you can target them specifically:

```typescript
import { ThrottlerModule } from "@nestjs/throttler";

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      name: "auth",
      ttl: 60000,
      limit: 10,
    }]),
  ],
})
```
