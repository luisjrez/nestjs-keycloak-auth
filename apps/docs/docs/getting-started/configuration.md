# Configuration

## AuthModuleOptions

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `keycloakConfigPath` | `string` | — | No* | Path to keycloak-realm.json |
| `keycloak` | `KeycloakConfig` | — | No* | Inline Keycloak config |
| `jwt` | `JwtConfig` | — | **Yes** | JWT signing keys and expiry |
| `email` | `EmailConfig` | — | **Yes** | SMTP connection for emails |
| `tokenStore` | `ITokenStore` | — | **Yes** | Your implementation of token storage |
| `baseUrl` | `string` | `https://example.com` | No | Used in email links |
| `cookieSecure` | `boolean` | `false` | No | Set `true` in production |
| `cookieDomain` | `string` | — | No | Domain for refresh token cookie |

\* Either `keycloak` or `keycloakConfigPath` is required.

## JwtConfig

```typescript
interface JwtConfig {
  accessToken: {
    secret: string;    // HS256 secret (min 32 chars recommended)
    expiresIn: string; // e.g., "15m", "1h"
  };
  refreshToken: {
    secret: string;    // Different secret than access token
    expiresIn: string; // e.g., "7d", "30d"
  };
}
```

## EmailConfig

```typescript
interface EmailConfig {
  from: string;
  transport: {
    host: string;
    port: number;
    user?: string;
    pass?: string;
    ignoreTLS?: boolean; // true for Mailpit
  };
}
```

## KeycloakConfig

```typescript
interface KeycloakConfig {
  serverUrl: string;     // e.g., http://localhost:8080
  realm: string;         // Keycloak realm name
  clientId: string;      // Confidential client ID
  clientSecret: string;  // Client secret
}
```

## ORM-agnostic tokenStore

The package is **100% ORM-agnostic**. `ITokenStore` is a plain TypeScript interface —
you implement it with whichever storage backend you prefer:

- **Prisma** — native Node.js + TypeScript ORM
- **TypeORM** — traditional decorator-based ORM
- **Drizzle ORM** — lightweight, type-safe SQL
- **Redis** — key-value store for fast token lookups
- **Firebase Firestore** — serverless NoSQL
- **InMemoryTokenStore** — built-in, for dev/test only

The `imports` array in `forRootAsync` is a **NestJS DI scope** mechanic, not an ORM
coupling. You pass whatever module provides your token store's dependencies.

### With Prisma

```typescript
// your-app/token-stores/prisma-token.store.ts
import { Injectable } from "@nestjs/common";
import type { ITokenStore, TokenRecord } from "@luisjrez/nestjs-keycloak-auth";
import { PrismaService } from "../prisma/prisma.service";
import { createHash } from "node:crypto";

@Injectable()
export class PrismaTokenStore implements ITokenStore {
  constructor(private readonly prisma: PrismaService) {}

  async save(record: TokenRecord): Promise<void> {
    await this.prisma.token.create({
      data: {
        userId: record.userId,
        type: record.type,
        tokenHash: createHash("sha256").update(record.token).digest("hex"),
        expiresAt: record.expiresAt,
      },
    });
  }

  async findByToken(token: string, type: TokenRecord["type"]) {
    const hash = createHash("sha256").update(token).digest("hex");
    const row = await this.prisma.token.findFirst({
      where: { tokenHash: hash, type, consumedAt: null },
    });
    if (!row) return null;
    return { id: row.id, userId: row.userId, type: row.type as TokenRecord["type"], token: row.tokenHash, expiresAt: row.expiresAt, consumedAt: row.consumedAt ?? undefined, createdAt: row.createdAt };
  }

  async markConsumed(id: string): Promise<void> {
    await this.prisma.token.update({ where: { id }, data: { consumedAt: new Date() } });
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.token.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }

  async saveUserData(userId: string, key: string, value: string): Promise<void> {
    await this.prisma.userData.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, value },
      update: { value },
    });
  }

  async getUserData(userId: string, key: string): Promise<string | null> {
    const row = await this.prisma.userData.findUnique({ where: { userId_key: { userId, key } } });
    return row?.value ?? null;
  }

  async deleteUserData(userId: string, key: string): Promise<void> {
    await this.prisma.userData.deleteMany({ where: { userId, key } });
  }
}

// your-app/app.module.ts
@Module({
  imports: [
    PrismaModule,
    AuthModule.forRootAsync({
      imports: [PrismaModule],          // ← your ORM module (NestJS DI scope)
      inject: [PrismaService],          // ← your ORM service
      useFactory: (prisma: PrismaService) => ({
        keycloak: { serverUrl: "http://localhost:8080", realm: "my-app", clientId: "my-app-api", clientSecret: "..." },
        jwt: { accessToken: { secret: process.env.ACCESS_TOKEN_SECRET!, expiresIn: "15m" }, refreshToken: { secret: process.env.REFRESH_TOKEN_SECRET!, expiresIn: "7d" } },
        email: { from: "noreply@example.com", transport: { host: process.env.SMTP_HOST ?? "localhost", port: Number(process.env.SMTP_PORT ?? "1025") } },
        tokenStore: new PrismaTokenStore(prisma),
      }),
    }),
  ],
})
export class AppModule {}
```

### With TypeORM

```typescript
// your-app/token.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Token {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column() userId: string;
  @Column() type: string;
  @Column() tokenHash: string;
  @Column() expiresAt: Date;
  @Column({ nullable: true }) consumedAt?: Date;
  @Column() createdAt: Date;
}

// your-app/token-stores/typeorm-token.store.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { ITokenStore, TokenRecord } from "@luisjrez/nestjs-keycloak-auth";
import { Token } from "./token.entity";
import { createHash } from "node:crypto";

@Injectable()
export class TypeOrmTokenStore implements ITokenStore {
  constructor(
    @InjectRepository(Token)
    private readonly repo: Repository<Token>,
  ) {}

  async save(record: TokenRecord): Promise<void> {
    await this.repo.save({
      userId: record.userId,
      type: record.type,
      tokenHash: createHash("sha256").update(record.token).digest("hex"),
      expiresAt: record.expiresAt,
      createdAt: new Date(),
    });
  }

  async findByToken(token: string, type: TokenRecord["type"]) {
    const hash = createHash("sha256").update(token).digest("hex");
    const row = await this.repo.findOneBy({ tokenHash: hash, type, consumedAt: null });
    if (!row) return null;
    return { id: row.id, userId: row.userId, type: row.type as TokenRecord["type"], token: row.tokenHash, expiresAt: row.expiresAt, consumedAt: row.consumedAt ?? undefined, createdAt: row.createdAt };
  }

  async markConsumed(id: string): Promise<void> {
    await this.repo.update(id, { consumedAt: new Date() });
  }

  async deleteExpired(): Promise<void> {
    await this.repo.delete({ expiresAt: LessThan(new Date()) });
  }

  async saveUserData(userId: string, key: string, value: string): Promise<void> {
    await this.repo.upsert(
      { userId, key, value },
      ["userId", "key"],
    );
  }

  async getUserData(userId: string, key: string): Promise<string | null> {
    const row = await this.repo.findOneBy({ userId, key });
    return row?.value ?? null;
  }

  async deleteUserData(userId: string, key: string): Promise<void> {
    await this.repo.delete({ userId, key });
  }
}

// your-app/app.module.ts
@Module({
  imports: [
    TypeOrmModule.forRoot({ ... }),
    TypeOrmModule.forFeature([Token]),
    AuthModule.forRootAsync({
      imports: [TypeOrmModule.forFeature([Token])],
      inject: [getRepositoryToken(Token)],
      useFactory: (repo: Repository<Token>) => ({
        keycloak: { serverUrl: process.env.KEYCLOAK_SERVER_URL!, realm: "my-app", clientId: "my-app-api", clientSecret: "..." },
        jwt: { accessToken: { secret: process.env.ACCESS_TOKEN_SECRET!, expiresIn: "15m" }, refreshToken: { secret: process.env.REFRESH_TOKEN_SECRET!, expiresIn: "7d" } },
        email: { from: "noreply@example.com", transport: { host: process.env.SMTP_HOST ?? "localhost", port: 1025 } },
        tokenStore: new TypeOrmTokenStore(repo),
      }),
    }),
  ],
})
export class AppModule {}
```

### With Redis

```typescript
import { Injectable } from "@nestjs/common";
import Redis from "ioredis";
import type { ITokenStore, TokenRecord } from "@luisjrez/nestjs-keycloak-auth";
import { createHash } from "node:crypto";

@Injectable()
export class RedisTokenStore implements ITokenStore {
  constructor(private readonly redis: Redis) {}

  async save(record: TokenRecord): Promise<void> {
    const key = `token:${record.type}:${createHash("sha256").update(record.token).digest("hex")}`;
    await this.redis.set(key, JSON.stringify(record), "PXAT", record.expiresAt.getTime());
  }

  async findByToken(token: string, type: TokenRecord["type"]) {
    const key = `token:${type}:${createHash("sha256").update(token).digest("hex")}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async markConsumed(id: string): Promise<void> {
    // Tokens expire naturally via TTL — no-op for Redis
  }

  async deleteExpired(): Promise<void> {
    // Redis auto-evicts expired keys — no-op
  }

  async saveUserData(userId: string, key: string, value: string): Promise<void> {
    await this.redis.set(`userdata:${userId}:${key}`, value);
  }

  async getUserData(userId: string, key: string): Promise<string | null> {
    return this.redis.get(`userdata:${userId}:${key}`);
  }

  async deleteUserData(userId: string, key: string): Promise<void> {
    await this.redis.del(`userdata:${userId}:${key}`);
  }
}
```

### With Drizzle ORM

```typescript
import { Injectable } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { eq, and, isNull, lt } from "drizzle-orm";
import type { ITokenStore, TokenRecord } from "@luisjrez/nestjs-keycloak-auth";
import { createHash } from "node:crypto";

const tokens = pgTable("tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  createdAt: timestamp("created_at").notNull(),
});

const userData = pgTable("user_data", {
  userId: text("user_id").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
});

@Injectable()
export class DrizzleTokenStore implements ITokenStore {
  constructor(private readonly db: ReturnType<typeof drizzle>) {}

  async save(record: TokenRecord): Promise<void> {
    await this.db.insert(tokens).values({
      id: record.id,
      userId: record.userId,
      type: record.type,
      tokenHash: createHash("sha256").update(record.token).digest("hex"),
      expiresAt: record.expiresAt,
      createdAt: new Date(),
    });
  }
  // ... implement remaining methods
}
```

## Using forRootAsync (recommended)

```typescript
AuthModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    keycloak: {
      serverUrl: config.get("KEYCLOAK_URL")!,
      realm: config.get("KEYCLOAK_REALM")!,
      clientId: config.get("KEYCLOAK_CLIENT_ID")!,
      clientSecret: config.get("KEYCLOAK_CLIENT_SECRET")!,
    },
    jwt: {
      accessToken: {
        secret: config.get("JWT_SECRET")!,
        expiresIn: config.get("JWT_EXPIRES_IN", "15m"),
      },
      refreshToken: {
        secret: config.get("REFRESH_SECRET")!,
        expiresIn: config.get("REFRESH_EXPIRES_IN", "7d"),
      },
    },
    email: {
      from: config.get("EMAIL_FROM")!,
      transport: {
        host: config.get("SMTP_HOST")!,
        port: config.get("SMTP_PORT")!,
        user: config.get("SMTP_USER"),
        pass: config.get("SMTP_PASS"),
      },
    },
    tokenStore: new PrismaTokenStore(prisma),
    baseUrl: config.get("APP_URL"),
    cookieSecure: config.get("NODE_ENV") === "production",
  }),
})
```

## Using forRoot (synchronous)

```typescript
AuthModule.forRoot({
  keycloakConfigPath: "./keycloak-realm.json",
  jwt: {
    accessToken: { secret: "my-secret", expiresIn: "15m" },
    refreshToken: { secret: "my-refresh-secret", expiresIn: "7d" },
  },
  email: {
    from: "noreply@example.com",
    transport: { host: "localhost", port: 1025 },
  },
  tokenStore: new InMemoryTokenStore(), // dev only!
  baseUrl: "http://localhost:3000",
  cookieSecure: false, // set true in production
})
```
