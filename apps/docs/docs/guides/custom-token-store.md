# Custom Token Store

`ITokenStore` is the **only** persistence dependency the package has. The
package ships no database driver and imports no ORM — it talks exclusively to
this interface, so you can back it with Prisma, TypeORM, Drizzle, Redis, or
anything else.

## Interface

```typescript
interface ITokenStore {
  save(record: TokenRecord): Promise<void>;
  findByToken(token: string, type: TokenRecord["type"]): Promise<TokenRecord | null>;
  markConsumed(id: string): Promise<boolean>;
  deleteExpired(): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
  saveUserData(userId: string, key: string, value: string): Promise<void>;
  getUserData(userId: string, key: string): Promise<string | null>;
  deleteUserData(userId: string, key: string): Promise<void>;
}

interface TokenRecord {
  id: string;
  userId: string;
  type: "MAGIC_LINK" | "RESET_PASSWORD" | "VERIFY_EMAIL" | "REFRESH_TOKEN" | "PRE_AUTH_2FA";
  token: string;       // hash this before persisting
  expiresAt: Date;
  consumedAt?: Date;
  createdAt: Date;
}
```

## The three contract rules that matter

Getting any of these wrong silently disables a security feature — the types
won't catch it, so read carefully:

1. **Hash tokens before storing.** `save` receives the token in clear text;
   persist `hashToken(record.token)`, never the raw value. `findByToken`
   receives the clear-text token and must hash it to look up. Import the
   package's helper:

   ```typescript
   import { hashToken } from "@luisjrez/nestjs-keycloak-auth";
   ```

2. **`findByToken` must return consumed records too.** Do **not** filter
   `WHERE consumedAt IS NULL`. Refresh-token reuse detection works by finding a
   record whose `consumedAt` is already set — if you hide consumed rows, a
   stolen-and-rotated token is silently accepted.

3. **`markConsumed` must be atomic and return a boolean.** Implement it as a
   conditional update and report whether a row actually changed:

   ```sql
   UPDATE tokens SET consumed_at = now() WHERE id = ? AND consumed_at IS NULL
   ```

   Return `true` only if one row was affected. Returning `false` signals a
   concurrent/repeated consume — the use case treats that as reuse. Always
   returning `true` opens a double-use race window.

`deleteAllForUser` revokes every token for a user (used after reuse detection
and after a password reset). `saveUserData` is an upsert keyed on
`(userId, key)` — it also stores lockout counters under the literal userId
`"system"`, so tolerate any string userId.

## Minimal schema

Two tables:

| tokens | user data |
|---|---|
| `id`, `userId`, `type`, `tokenHash`, `expiresAt`, `consumedAt` (nullable), `createdAt` | `userId`, `key`, `value` |
| index `tokenHash`, index `userId` | unique `(userId, key)` |

## Verify your store against the contract

The three rules above aren't checkable by the compiler, so the package ships a
**conformance suite** you can run against your own implementation. It's
framework-agnostic — plug it into Jest, Vitest, or `node:test`:

```typescript
import { tokenStoreContractCases } from "@luisjrez/nestjs-keycloak-auth/testing";

describe("MyTokenStore", () => {
  // Return a FRESH, EMPTY store per case (use an in-memory DB or truncate).
  const makeStore = () => new MyTokenStore(makeInMemoryDb());

  for (const { name, run } of tokenStoreContractCases(makeStore)) {
    it(name, () => run());
  }
});
```

Or, outside a test runner (e.g. a non-prod startup self-check):

```typescript
import { assertTokenStoreContract } from "@luisjrez/nestjs-keycloak-auth/testing";

await assertTokenStoreContract(() => new MyTokenStore(db)); // throws on violation
```

The suite covers all eight methods and specifically catches the two silent
security bugs: a `findByToken` that hides consumed records, and a
`markConsumed` that isn't atomic. The TypeORM and Drizzle examples below run it
against an in-memory SQLite database — no Docker required.

## Complete, runnable examples

Three full example apps in this repo implement the same store against different
ORMs — all on SQLite (no database container needed; only Keycloak runs in
Docker):

- **Prisma** — [`apps/demo-api`](https://github.com/luisjrez/keycloak-nestjs-authentication-api/tree/main/apps/demo-api) (`src/prisma/prisma-token.store.ts`)
- **TypeORM** — [`apps/example-typeorm`](https://github.com/luisjrez/keycloak-nestjs-authentication-api/tree/main/apps/example-typeorm) (`src/typeorm/typeorm-token.store.ts`)
- **Drizzle** — [`apps/example-drizzle`](https://github.com/luisjrez/keycloak-nestjs-authentication-api/tree/main/apps/example-drizzle) (`src/db/drizzle-token.store.ts`)

Each has an E2E suite that proves register → login → refresh-rotation →
reuse-detection all work through that store.

## Sketch: Redis store

```typescript
import Redis from "ioredis";
import { hashToken, type ITokenStore, type TokenRecord } from "@luisjrez/nestjs-keycloak-auth";

export class RedisTokenStore implements ITokenStore {
  constructor(private readonly redis: Redis) {}

  async save(record: TokenRecord): Promise<void> {
    const key = `token:${record.type}:${hashToken(record.token)}`;
    await this.redis.set(key, JSON.stringify({ ...record, token: hashToken(record.token) }),
      "PXAT", record.expiresAt.getTime());
  }
  // markConsumed: use a Lua script or WATCH/MULTI for the atomic conditional set.
  // ... implement remaining methods
}
```

> Note: Redis needs care to make `markConsumed` atomic (a Lua script or
> optimistic `WATCH`/`MULTI`), and `findByToken` must still surface consumed
> records within their TTL. The SQL examples above are simpler to get right.
