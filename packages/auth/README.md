<p align="center">
  <img src="https://raw.githubusercontent.com/luisjrez/nestjs-keycloak-auth/main/apps/docs/static/img/logo.svg" alt="nestjs-keycloak-auth logo" width="140" />
</p>

# @luisjrez/nestjs-keycloak-auth

A clean-architecture NestJS authentication module backed by Keycloak as the source of truth for identity — with local token storage for extended profile, refresh tokens, and 2FA secrets.

## Features

- Registration / Login / Logout with Keycloak
- JWT access tokens (HS256, signed locally via `jose`)
- Refresh tokens in httpOnly cookies
- Forgot / Reset password
- Magic link authentication
- TOTP 2FA (via `speakeasy`, secrets stored in your token store)
- Email notification via Mailpit / any nodemailer-compatible SMTP
- React Email templates
- 16 typed domain errors → HTTP status mapping
- Auth event bus for extension

## Requirements

- NestJS 10+
- Keycloak 25+
- Node.js 20+

## Installation

```bash
pnpm add @luisjrez/nestjs-keycloak-auth cookie-parser
```

## Quick Start

### 1. Generate Keycloak realm

```bash
npx auth-cli init --output keycloak-realm.json
```

### 2. Configure and register the module

```typescript
import { AuthModule } from "@luisjrez/nestjs-keycloak-auth";
import { PrismaTokenStore } from "./prisma/prisma-token.store";

@Module({
  imports: [
    AuthModule.forRoot({
      keycloakConfigPath: "keycloak-realm.json",
      jwt: { secret: "your-256-bit-secret", expiresIn: 900 },
      email: {
        host: "localhost",
        port: 1025,
        fromEmail: "noreply@example.com",
      },
      tokenStore: new PrismaTokenStore(prisma),
      baseUrl: "http://localhost:3000",
      cookieSecure: process.env["NODE_ENV"] === "production",
    }),
  ],
})
export class AppModule {}
```

### 3. Apply cookie-parser in main.ts

```typescript
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
    credentials: true,
  });

  app.use(cookieParser());
  await app.listen(3000);
}
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Login, returns JWT + sets httpOnly cookie |
| POST | `/auth/refresh` | Public | Refresh access token (cookie or body) |
| POST | `/auth/logout` | JWT | Logout (invalidates refresh token in Keycloak) |
| POST | `/auth/forgot-password` | Public | Send password reset email |
| POST | `/auth/reset-password` | Public | Reset password with token |
| POST | `/auth/magic-link` | Public | Send magic link email |
| POST | `/auth/magic-link/verify` | Public | Verify magic link token |
| POST | `/auth/2fa/setup` | JWT | Set up TOTP 2FA |
| POST | `/auth/2fa/verify` | JWT | Verify TOTP code |
| GET | `/auth/me` | JWT | Get current user info |

## Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `keycloakConfigPath` | `string` | — | Path to keycloak-realm.json |
| `keycloak` | `KeycloakConfig` | — | Inline Keycloak config (alternative) |
| `jwt` | `JwtConfig` | required | JWT secret & expiry |
| `email` | `EmailConfig` | required | SMTP connection |
| `tokenStore` | `ITokenStore` | required | Your implementation |
| `baseUrl` | `string` | `https://example.com` | Used in email links |
| `cookieSecure` | `boolean` | `false` | Set `true` in production |
| `cookieDomain` | `string` | — | Optional cookie domain |

## Token Store

The module requires an implementation of `ITokenStore`. The demo API provides a `PrismaTokenStore` — implement it for your ORM (TypeORM, Drizzle, MikroORM, etc.).

```typescript
export interface ITokenStore {
  save(token: TokenRecord): Promise<void>;
  findByToken(hashedToken: string): Promise<TokenRecord | null>;
  findByUser(userId: string): Promise<TokenRecord[]>;
  deleteByToken(hashedToken: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
  saveUserData(userId: string, key: string, value: string): Promise<void>;
  getUserData(userId: string, key: string): Promise<string | null>;
  deleteUserData(userId: string, key: string): Promise<void>;
}
```

## Events

Listen to authentication events via `AuthEventBus`:

```typescript
constructor(private readonly eventBus: AuthEventBus) {
  eventBus.on(UserRegisteredEvent, (event) => {
    // event.email, event.username
  });
}
```

Available events: `UserRegisteredEvent`, `UserLoggedInEvent`, `UserLoggedOutEvent`, `MagicLinkSentEvent`, `PasswordResetEvent`, `TwoFactorEnabledEvent`, `TwoFactorDisabledEvent`.

## Rate Limiting

For production, we recommend adding `@nestjs/throttler` to your app:

```bash
pnpm add @nestjs/throttler
```

```typescript
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

## License

MIT
