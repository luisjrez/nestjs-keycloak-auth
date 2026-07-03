# Example: TypeORM + SQLite

A minimal consumer of [`@luisjrez/nestjs-keycloak-auth`](../../packages/auth)
that implements the `ITokenStore` port with **TypeORM** on a **SQLite** file.

The point of this example: the auth package is ORM-agnostic. It depends on
nothing but the `ITokenStore` interface — no database driver, no Prisma. Swap
in TypeORM (here), Drizzle ([../example-drizzle](../example-drizzle)), Prisma
([../demo-api](../demo-api)), or anything else.

## Why SQLite

The **token store** is just a table, so it runs on a local SQLite file — no
database container needed. Only **Keycloak** (the identity provider) and
**Mailpit** (email capture) run in Docker, because Keycloak *is* the external
dependency this package integrates with.

## The only file that matters

[`src/typeorm/typeorm-token.store.ts`](src/typeorm/typeorm-token.store.ts) —
the `ITokenStore` implementation. Note the three contract points it honors:

1. `save` / `findByToken` hash the token with `hashToken` (never store plaintext).
2. `findByToken` returns consumed records too (reuse detection needs them).
3. `markConsumed` is an atomic conditional update returning a boolean.

## Run it

```bash
# From the repo root — start Keycloak + Mailpit (SQLite needs no container)
pnpm docker:up

# Then run this app
pnpm --filter example-typeorm dev
# → http://localhost:3001/api/health
```

## Test it

```bash
# Needs Keycloak up (pnpm docker:up)
pnpm --filter example-typeorm test:e2e
```

The E2E suite proves register → login → refresh-rotation → reuse-detection all
work through the TypeORM store.
