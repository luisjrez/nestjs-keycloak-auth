<p align="center">
  <img src="https://raw.githubusercontent.com/luisjrez/nestjs-keycloak-auth/main/apps/docs/static/img/logo.svg" alt="nestjs-keycloak-auth logo" width="160" />
</p>

<h1 align="center">@luisjrez/nestjs-keycloak-auth</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@luisjrez/nestjs-keycloak-auth">
    <img src="https://img.shields.io/npm/v/@luisjrez/nestjs-keycloak-auth?style=flat-square" alt="npm" />
  </a>
  <a href="https://github.com/luisjrez/nestjs-keycloak-auth/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/luisjrez/nestjs-keycloak-auth/ci.yml?branch=main&style=flat-square&label=CI" alt="CI" />
  </a>
  <a href="https://luisjrez.github.io/nestjs-keycloak-auth/">
    <img src="https://img.shields.io/badge/docs-docusaurus-blue?style=flat-square" alt="Documentation" />
  </a>
  <a href="https://github.com/luisjrez/nestjs-keycloak-auth/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/@luisjrez/nestjs-keycloak-auth?style=flat-square" alt="License" />
  </a>
  <a href="https://github.com/luisjrez/nestjs-keycloak-auth">
    <img src="https://img.shields.io/github/stars/luisjrez/nestjs-keycloak-auth?style=flat-square" alt="GitHub Stars" />
  </a>
</p>

A clean-architecture NestJS authentication module backed by Keycloak — **identity
handled by Keycloak, tokens signed locally, your DB your schema.**

> 📖 **Full documentation**: https://luisjrez.github.io/nestjs-keycloak-auth/

---

## Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Local Development](#local-development)
- [Configuration](#configuration)
- [CLI Tool](#cli-tool)
- [API Endpoints](#api-endpoints)
- [Extensions & Events](#extensions--events)
- [Testing](#testing)
- [Deployment](#deployment)
  - [Staging (low-cost)](#staging)
  - [Production](#production)
- [Publishing](#publishing)
- [FAQ](#faq)

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Your NestJS App                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │           @luisjrez/nestjs-keycloak-auth          │  │
│  │                                                    │  │
│  │  ┌──────────┐   ┌──────────────┐   ┌──────────┐  │  │
│  │  │  nestjs/  │──▶│ application/ │──▶│ domain/  │  │  │
│  │  │ modules   │   │ use-cases    │   │ entities │  │  │
│  │  │ guards    │   │ dtos         │   │ ports    │  │  │
│  │  │ decorators│   │              │   │ errors   │  │  │
│  │  └─────┬─────┘   └──────┬───────┘   └────┬─────┘  │  │
│  │        │                │                 │        │  │
│  │  ┌─────▼────────────────▼─────────────────▼──────┐ │  │
│  │  │           infrastructure/                      │ │  │
│  │  │  KeycloakAuth │ MailpitSender │ JwtService     │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌────────────────────┐         ┌──────────────────────┐   │
│  │     Keycloak        │         │  Mailpit (Docker)    │   │
│  │  (User Store / IAM) │◀────────│  (Email Dev)         │   │
│  └────────────────────┘         └──────────────────────┘   │
│                                                            │
│  ┌──────────────────────────────────────────────────┐      │
│  │        Your DB (Prisma/TypeORM/etc)              │      │
│  │  UserProfile │ Token (magic links, resets, etc)  │      │
│  └──────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Keycloak Source of Truth**: User identity (credentials, 2FA, email
  verification) lives in Keycloak. The package talks to Keycloak via Admin
  REST API + OIDC.
- **Local JWT Signing**: After Keycloak validates credentials, the package signs
  its own JWTs locally — no round-trip to Keycloak on every request.
- **Clean Architecture**: Domain layer has zero external dependencies. Use
  cases orchestrate flows. Infrastructure implements ports.
- **ORM-agnostic**: The package provides `ITokenStore` port. You implement it
  with your ORM of choice (Prisma example included).
- **Event-driven Extensions**: `AuthEventBus` lets you react to auth events
  anywhere in your app — no config bloat.

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) 9+
- [Docker](https://docker.com) (via [Colima](https://github.com/abiosoft/colima) on macOS)
- [Colima](https://github.com/abiosoft/colima)

### 1. Start Colima & Docker Services

```bash
# Start Colima (if not already running)
colima start --cpu 4 --memory 8

# Start Keycloak, PostgreSQL, and Mailpit
pnpm docker:up

# Check logs
pnpm docker:logs
```

Keycloak will be available at http://localhost:8080 (admin / admin).
Mailpit UI at http://localhost:8025.

### 2. Generate Keycloak Realm Configuration

```bash
# From the monorepo root
pnpm --filter @luisjrez/nestjs-keycloak-auth build

# Run the CLI wizard
node packages/auth/dist/cli/bin.js init

# Or via the demo-api
cd apps/demo-api
pnpm auth-cli init
```

The wizard will prompt for:
- **Realm name** (e.g., `my-app`)
- **Client ID** (e.g., `my-app-api`)
- **Client Secret** (auto-generated or manual)
- **Redirect URIs** (e.g., `http://localhost:3000/*`)

This generates a `keycloak-realm.json` file ready to import.

### 3. Import the Realm into Keycloak

```bash
# Copy the JSON into Keycloak's import directory
docker cp ./keycloak-realm.json kc-auth-keycloak:/opt/keycloak/data/import/

# Restart Keycloak to trigger the import
docker compose -f docker/docker-compose.yml restart keycloak
```

### 4. Start the Demo API

```bash
# Install dependencies
pnpm install

# Generate Prisma client
cd apps/demo-api
pnpm prisma:generate
pnpm prisma:migrate --name init

# Start dev server
pnpm dev
```

The API will be running at http://localhost:3000.

```bash
# Test the health endpoint
curl http://localhost:3000/api/health

# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"securepass123"}'
```

---

## Local Development

### Project Structure

```
keycloak-nestjs-authentication-api/
├── packages/auth/          # Published package @luisjrez/nestjs-keycloak-auth
│   ├── src/domain/         # Entities, Value Objects, Ports (0 deps)
│   ├── src/application/    # Use cases, DTOs
│   ├── src/infrastructure/ # Keycloak, Email, JWT, Storage adapters
│   ├── src/nestjs/         # NestJS module, controllers, guards
│   ├── src/cli/            # CLI tool (auth-cli)
│   └── src/email-templates/ # React Email templates
├── apps/demo-api/          # Demo NestJS API with Prisma
└── docker/                 # Keycloak + Postgres + Mailpit
```

### Commands

```bash
# Start all services
pnpm docker:up

# Stop all services
pnpm docker:down

# Watch mode — both package + demo-api
pnpm dev

# Build all packages
pnpm build

# Run all tests
pnpm test

# Type check
pnpm typecheck

# View Docker logs
pnpm docker:logs
```

### Mailpit (Email Preview)

All emails sent by the auth module are captured by Mailpit:
- **SMTP**: localhost:1025
- **Web UI**: http://localhost:8025

This includes: welcome emails, password reset links, magic links, and
verification emails.

---

## Configuration

### Module Registration

The package is **100% ORM-agnostic**. You bring your own `ITokenStore` implementation
with whichever ORM you prefer — Prisma, TypeORM, Drizzle, Redis, or plain SQL.

#### With Prisma

```typescript
// your-app/token-stores/prisma-token.store.ts
import { Injectable } from "@nestjs/common";
import type { ITokenStore, TokenRecord } from "@luisjrez/nestjs-keycloak-auth";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaTokenStore implements ITokenStore {
  constructor(private readonly prisma: PrismaService) {}

  async save(record: TokenRecord): Promise<void> {
    await this.prisma.token.create({ data: { ... } });
  }
  // ... implement findByToken, markConsumed, deleteExpired, saveUserData, getUserData, deleteUserData
}

// your-app/app.module.ts
@Module({
  imports: [
    AuthModule.forRootAsync({
      imports: [PrismaModule],   // ← your ORM module (NestJS DI scope)
      inject: [PrismaService],   // ← your ORM service
      useFactory: (prisma: PrismaService) => ({
        keycloakConfigPath: "./keycloak-realm.json",
        jwt: {
          accessToken: { secret: process.env.ACCESS_TOKEN_SECRET!, expiresIn: "15m" },
          refreshToken: { secret: process.env.REFRESH_TOKEN_SECRET!, expiresIn: "7d" },
        },
        email: {
          from: "noreply@example.com",
          transport: { host: process.env.SMTP_HOST ?? "localhost", port: Number(process.env.SMTP_PORT ?? "1025") },
        },
        tokenStore: new PrismaTokenStore(prisma),
      }),
    }),
  ],
})
export class AppModule {}
```

#### With TypeORM

```typescript
// your-app/token-stores/typeorm-token.store.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { ITokenStore, TokenRecord } from "@luisjrez/nestjs-keycloak-auth";
import { Token } from "./token.entity";

@Injectable()
export class TypeOrmTokenStore implements ITokenStore {
  constructor(
    @InjectRepository(Token)
    private readonly repo: Repository<Token>,
  ) {}

  async save(record: TokenRecord): Promise<void> {
    await this.repo.save({ ...record, tokenHash: hash(record.token) });
  }
  // ... implement remaining methods
}

// your-app/app.module.ts
@Module({
  imports: [
    TypeOrmModule.forRoot({ ... }),
    TypeOrmModule.forFeature([Token]),
    AuthModule.forRootAsync({
      imports: [TypeOrmModule.forFeature([Token])],  // ← just for DI scope
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

> **Note**: The `imports` array in `forRootAsync` is a NestJS DI mechanic, not an ORM coupling.
> It makes your module's providers resolvable inside the factory function. The auth package has
> **zero** ORM dependencies — you pass whatever module provides your token store's dependencies.

#### Sync setup (simplest, after env vars are loaded)

```typescript
@Module({
  imports: [
    AuthModule.forRoot({
      keycloak: { serverUrl: "http://localhost:8080", realm: "my-app", clientId: "my-app-api", clientSecret: "..." },
      jwt: { accessToken: { secret: "my-secret", expiresIn: "15m" }, refreshToken: { secret: "my-secret", expiresIn: "7d" } },
      email: { from: "noreply@example.com", transport: { host: "localhost", port: 1025 } },
      tokenStore: new InMemoryTokenStore(),  // any ITokenStore impl
    }),
  ],
})
export class AppModule {}
```

### Environment Variables

```bash
# Keycloak
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=my-app
KEYCLOAK_CLIENT_ID=my-app-api
KEYCLOAK_CLIENT_SECRET=change-me

# JWT (local signing)
ACCESS_TOKEN_SECRET=generate-a-random-64-char-string
REFRESH_TOKEN_SECRET=generate-a-different-64-char-string

# Database (for the demo app)
DATABASE_URL=postgresql://keycloak:keycloak@localhost:5432/auth_demo

# Email
EMAIL_FROM=noreply@example.com
SMTP_HOST=localhost
SMTP_PORT=1025
```

---

## CLI Tool

The `auth-cli` tool helps you generate, export, and import Keycloak realm
configurations.

```bash
# Interactive wizard — generates keycloak-realm.json
pnpm auth-cli init

# Export from a running Keycloak instance
pnpm auth-cli export \
  --server-url http://localhost:8080 \
  --realm my-app \
  --username admin \
  --password admin \
  --output ./keycloak-realm.json

# Import into a running Keycloak instance
pnpm auth-cli import \
  --server-url http://localhost:8080 \
  --username admin \
  --password admin \
  --file ./keycloak-realm.json
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | ✗ | Create account + send verify email |
| POST | `/api/auth/login` | ✗ | Login → access token + httpOnly refresh cookie |
| POST | `/api/auth/refresh` | ✗ | Use refresh cookie for new token pair |
| POST | `/api/auth/logout` | ✓ | Clear refresh cookie |
| POST | `/api/auth/forgot-password` | ✗ | Send password reset email |
| POST | `/api/auth/reset-password` | ✗ | Reset password with token |
| POST | `/api/auth/magic-link` | ✗ | Send magic link email |
| POST | `/api/auth/magic-link/verify` | ✗ | Verify magic link → tokens |
| POST | `/api/auth/2fa/setup` | ✓ | Get TOTP secret + QR code |
| POST | `/api/auth/2fa/verify` | ✓ | Verify TOTP code |
| GET | `/api/auth/me` | ✓ | Current user profile |

---

## Extensions & Events

The package emits typed events that you can subscribe to anywhere in your app:

```typescript
import { Injectable } from "@nestjs/common";
import {
  AuthEventBus,
  UserRegisteredEvent,
  UserLoggedInEvent,
} from "@luisjrez/nestjs-keycloak-auth";

@Injectable()
export class UserProfileService {
  constructor(private readonly eventBus: AuthEventBus) {
    // Called when a user registers
    this.eventBus.on(UserRegisteredEvent, async (event) => {
      await this.createProfile(event.keycloakId, event.email, event.username);
    });

    // Called when a user logs in
    this.eventBus.on(UserLoggedInEvent, async (event) => {
      await this.updateLastLogin(event.userId);
    });
  }

  private async createProfile(keycloakId: string, email: string, username: string) {
    // Create extended profile in your own DB
  }

  private async updateLastLogin(userId: string) {
    // Track login activity
  }
}
```

### Available Events

| Event | Payload | When |
|-------|---------|------|
| `UserRegisteredEvent` | keycloakId, email, username | After Keycloak user created |
| `UserLoggedInEvent` | userId, email | After successful login |
| `UserLoggedOutEvent` | userId | After logout |
| `MagicLinkSentEvent` | userId, email | Magic link email sent |
| `PasswordResetEvent` | userId | Password successfully reset |
| `TwoFactorEnabledEvent` | userId | 2FA configured |
| `TwoFactorDisabledEvent` | userId | 2FA disabled |

---

## Testing

```bash
# Run all tests (package + demo-api)
pnpm test

# Run specific package tests
pnpm --filter @luisjrez/nestjs-keycloak-auth test

# Run demo-api tests
pnpm --filter demo-api test

# Run e2e tests
pnpm --filter demo-api test:e2e

# With coverage
pnpm --filter @luisjrez/nestjs-keycloak-auth test:cov
```

### Test Strategy

- **Unit tests**: Domain entities, value objects, pure use cases
- **Integration tests**: KeycloakAuthProvider against real Docker Keycloak
- **E2E tests**: Full HTTP flow against the demo API

---

## Deployment

### Staging

| Provider | Configuration | Est. Cost |
|----------|--------------|-----------|
| **Railway** | Keycloak container + Postgres plugin | ~$5-15/mo |
| **Fly.io** | Keycloak as Fly Machine + Postgres cluster | ~$10-20/mo |
| **Hetzner CX22** | VPS + Docker Compose + Postgres container | ~$8/mo |

#### Railway (Recommended for Staging)

```bash
# 1. Install Railway CLI
brew install railway

# 2. Login and create project
railway login
railway init

# 3. Add Keycloak from Railway template or custom Dockerfile
# railway add - https://railway.app/template/keycloak

# 4. Set environment variables
railway variables set \
  KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  KC_BOOTSTRAP_ADMIN_PASSWORD=<strong-password> \
  KC_DB=postgres \
  KC_DB_URL=postgresql://...
```

### Production

| Provider | Configuration | Est. Cost |
|----------|--------------|-----------|
| **Hetzner CPX31** | Docker Compose + Caddy reverse proxy + automated backups | ~$15-25/mo |
| **DigitalOcean App Platform** | Managed Postgres + Docker container | ~$25-40/mo |
| **AWS ECS Fargate** | ECS + RDS Postgres + ALB | ~$40-80/mo |
| **Red Hat SSO** | Managed Keycloak by Red Hat (enterprise) | ~$50-200/mo |

#### Hetzner VPS (Best value for prod)

```bash
# 1. Provision a CPX31 on Hetzner Cloud (4 vCPU, 8GB RAM, ~$15/mo)

# 2. Install Docker & Docker Compose
ssh root@your-server
apt update && apt install -y docker.io docker-compose-v2
ufw allow 22,80,443,5432/tcp

# 3. Copy docker-compose.prod.yml and .env to server
scp docker/docker-compose.prod.yml root@your-server:/opt/keycloak/
scp .env.root@your-server:/opt/keycloak/.env

# 4. Deploy
ssh root@your-server
cd /opt/keycloak
docker compose -f docker-compose.prod.yml up -d

# 5. Set up Caddy reverse proxy (auto HTTPS)
docker run -d \
  -p 80:80 -p 443:443 \
  -v caddy_data:/data \
  -v "$PWD/Caddyfile:/etc/caddy/Caddyfile" \
  caddy
```

#### docker-compose.prod.yml

```yaml
services:
  keycloak:
    image: quay.io/keycloak/keycloak:25.0
    command: start --import-realm
    environment:
      KC_BOOTSTRAP_ADMIN_USERNAME: ${KC_ADMIN_USER}
      KC_BOOTSTRAP_ADMIN_PASSWORD: ${KC_ADMIN_PASS}
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://${DB_HOST}:5432/${DB_NAME}
      KC_DB_USERNAME: ${DB_USER}
      KC_DB_PASSWORD: ${DB_PASS}
      KC_HOSTNAME: auth.yourdomain.com
      KC_HTTP_PORT: 8080
      KC_PROXY: edge
    volumes:
      - ./keycloak:/opt/keycloak/data/import:ro
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes:
      - postgres_prod:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_prod:
```

> **Security notes for production:**
> - Use strong random passwords for `KC_BOOTSTRAP_ADMIN_PASSWORD`
> - Run Keycloak behind a reverse proxy (Caddy, Nginx, Traefik) with HTTPS
> - Enable automatic backups for the Postgres volume
> - Restrict Keycloak Admin API to internal network
> - Rotate client secrets regularly

---

## Publishing

```bash
# 1. Build the package
pnpm --filter @luisjrez/nestjs-keycloak-auth build

# 2. Publish to npm
pnpm --filter @luisjrez/nestjs-keycloak-auth publish

# Or with a scoped package:
pnpm --filter @luisjrez/nestjs-keycloak-auth publish --access public
```

---

## FAQ

### Why JWT signing locally instead of using Keycloak tokens directly?

Verifying Keycloak's RS256 JWTs requires fetching JWKS keys from Keycloak on
every verification (or caching). By signing our own HS256 tokens locally, we
eliminate network calls during request authentication, can embed custom claims,
and keep tokens valid even during brief Keycloak restarts. Token revocation is
handled by short access token expiry (15 min) + refresh token rotation.

### Can I use this without Docker / Colima?

Yes. You can point the module at any Keycloak instance — local, remote, or
managed. The Docker setup is only for local development.

### How do I add custom fields to the user?

Listen to `UserRegisteredEvent` via `AuthEventBus` and create a profile in
your own database with whatever fields you need.

### Do I need Prisma?

No. The `ITokenStore` port can be implemented with any ORM or storage backend.
The demo app uses Prisma as a reference implementation.
