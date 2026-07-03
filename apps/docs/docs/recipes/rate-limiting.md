# Rate Limiting

Rate limiting is **built in**. The module wires up `@nestjs/throttler`
internally and applies sensible per-endpoint limits out of the box — you don't
register `ThrottlerModule` yourself.

`@nestjs/throttler` is a peer dependency, so install it in your app:

```bash
pnpm add @nestjs/throttler
```

## Default per-endpoint limits

| Endpoint | Limit |
|---|---|
| `POST /auth/register` | 5 / min |
| `POST /auth/login` | 10 / min |
| `POST /auth/2fa/complete` | 5 / min |
| `POST /auth/forgot-password` | 3 / min |
| `POST /auth/reset-password` | 5 / min |
| `POST /auth/magic-link` | 3 / min |
| `POST /auth/magic-link/verify` | 5 / min |
| `GET /auth/health`, `POST /auth/refresh` | not throttled |

## Tuning the global window

The fallback limit for any throttled route (and its window) comes from the
`rateLimit` option:

```typescript
AuthModule.forRootAsync({
  useFactory: () => ({
    // ...
    rateLimit: {
      limit: 20, // requests per window
      ttl: 60,   // window in seconds
    },
  }),
});
```

## Scaling horizontally

The default storage is in-memory, so each replica counts requests
independently. Behind a load balancer with N replicas the effective limit is
N× the configured value. For a shared limit across replicas, provide a Redis
throttler storage in your app and be sure to configure `trust proxy` on the
Express instance so client IPs are resolved correctly behind the proxy.

:::note
Because rate limiting is per-IP and in-memory by default, treat it as one layer
of defense. Account lockout (the `lockout` option) protects a specific account
regardless of source IP.
:::
