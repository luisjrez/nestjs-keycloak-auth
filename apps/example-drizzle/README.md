# Example: Drizzle + SQLite

A minimal consumer of [`@luisjrez/nestjs-keycloak-auth`](../../packages/auth)
that implements the `ITokenStore` port with **Drizzle ORM** on a **SQLite** file.

Drizzle is a plain query builder — no decorators, no repositories — which makes
it the clearest demonstration that the auth package couples to nothing but the
`ITokenStore` interface.

## Why SQLite

The **token store** is just a table, so it runs on a local SQLite file — no
database container needed. Only **Keycloak** (the identity provider) and
**Mailpit** (email capture) run in Docker.

## The only file that matters

[`src/db/drizzle-token.store.ts`](src/db/drizzle-token.store.ts) — the
`ITokenStore` implementation. Note the three contract points it honors:

1. `save` / `findByToken` hash the token with `hashToken` (never store plaintext).
2. `findByToken` returns consumed records too (reuse detection needs them).
3. `markConsumed` is an atomic conditional update (`... WHERE id = ? AND
   consumed_at IS NULL`) returning a boolean via `.returning()`.

## Run it

```bash
# From the repo root — start Keycloak + Mailpit (SQLite needs no container)
pnpm docker:up

# Then run this app
pnpm --filter example-drizzle dev
# → http://localhost:3002/api/health
```

## Test it

```bash
# Needs Keycloak up (pnpm docker:up)
pnpm --filter example-drizzle test:e2e
```

The E2E suite proves register → login → refresh-rotation → reuse-detection all
work through the Drizzle store.
