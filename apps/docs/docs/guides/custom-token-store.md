# Custom Token Store

The `ITokenStore` interface is the persistence layer for tokens (magic links, reset tokens, refresh tokens) and key-value user data (2FA secrets).

## Interface

```typescript
interface ITokenStore {
  save(record: TokenRecord): Promise<void>;
  findByToken(token: string, type: TokenRecord["type"]): Promise<TokenRecord | null>;
  markConsumed(id: string): Promise<void>;
  deleteExpired(): Promise<void>;
  saveUserData(userId: string, key: string, value: string): Promise<void>;
  getUserData(userId: string, key: string): Promise<string | null>;
  deleteUserData(userId: string, key: string): Promise<void>;
}

interface TokenRecord {
  id: string;
  userId: string;
  type: "MAGIC_LINK" | "RESET_PASSWORD" | "VERIFY_EMAIL" | "REFRESH_TOKEN";
  token: string;       // Store the SHA-256 hash of the token
  expiresAt: Date;
  consumedAt?: Date;
  createdAt: Date;
}
```

## Token hashing

Always hash tokens before storing. Use SHA-256:

```typescript
import { createHash } from "node:crypto";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
```

## Example: Redis store

```typescript
import Redis from "ioredis";
import type { ITokenStore, TokenRecord } from "@luisjrez/nestjs-keycloak-auth";

export class RedisTokenStore implements ITokenStore {
  constructor(private readonly redis: Redis) {}

  async save(record: TokenRecord): Promise<void> {
    const key = `token:${hashToken(record.token)}`;
    await this.redis.set(key, JSON.stringify(record), "PXAT", record.expiresAt.getTime());
  }

  async findByToken(token: string, type: string): Promise<TokenRecord | null> {
    const key = `token:${hashToken(token)}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  // ... implement remaining methods
}
```

## Example: TypeORM store

```typescript
import { Repository } from "typeorm";
import type { ITokenStore, TokenRecord } from "@luisjrez/nestjs-keycloak-auth";

export class TypeOrmTokenStore implements ITokenStore {
  constructor(private readonly repo: Repository<TokenEntity>) {}

  async save(record: TokenRecord): Promise<void> {
    await this.repo.save({
      ...record,
      token: hashToken(record.token),
    });
  }
  // ... implement remaining methods
}
```
