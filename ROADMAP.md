# Roadmap — `@luisjrez/nestjs-keycloak-auth`

## Goal del package

Módulo NestJS plug-and-play que proporciona autenticación completa
(register, login, refresh, logout, forgot/reset password, magic link, 2FA TOTP)
usando Keycloak como Identity Provider, siguiendo Clean Architecture.

El consumer lo instala con `pnpm add @luisjrez/nestjs-keycloak-auth`, configura
un par de opciones, y ya tiene 13 endpoints de auth funcionando.

---

## Lo que tenemos

### Domain (0 dependencias externas)

- Entities: `User`, `TokenPair`
- Value objects: `Email`, `Password`
- Ports: `IAuthProvider`, `IEmailSender`, `ITokenStore`
- 16 errores tipados (`DomainError` → HTTP status)

### Application (10 use cases)

- `RegisterUseCase`, `LoginUseCase`, `RefreshTokenUseCase`
- `ForgotPasswordUseCase`, `ResetPasswordUseCase`
- `SendMagicLinkUseCase`, `VerifyMagicLinkUseCase`
- `Setup2FAUseCase`, `Verify2FAUseCase`, `LogoutUseCase`

### Infrastructure

- `KeycloakAuthProvider` — Admin REST API + OIDC, mapeo de errores
  (incluye `EmailNotVerifiedError` para "Account is not fully set up")
- `JwtTokenService` — HS256 via `jose`
- `MailpitEmailSender` — nodemailer con `ignoreTLS` configurable
- `InMemoryTokenStore` — para test/dev

### NestJS Module

- `forRoot` / `forRootAsync`
- `AuthController` — 13 endpoints con `@Throttle()` por endpoint
- `JwtAuthGuard`, `OptionalAuthGuard`, `CsrfGuard`
- `AuthExceptionFilter`, `AuthEventBus` (7 eventos)
- Rate limiting dinámico (lee de `AuthModuleOptions.rateLimit`)
- Account lockout con intentos máximos y duración configurable
- Validación de config al startup (`validateOptions`)

### CLI

- `auth-cli init`, `export`, `import`

### Tests

- 27 suites, 270 tests unitarios (Jest)
- 1 suite E2E (16 tests contra Keycloak real + PostgreSQL + Mailpit en Docker)

### Seguridad

- Refresh token rotation + reuse detection
- CSRF doble-submit cookie con `CsrfGuard` (timing-safe comparison)
- Helmet, SameSite=Strict, httpOnly cookies
- Token hashing SHA-256
- Password complexity (uppercase, lowercase, number, special)

### Demo API

- NestJS app funcional con Prisma, shutdown hooks, request logging

---

## Lo que falta para v1

| Prioridad | Task | Detalle | Dependencias |
|-----------|------|---------|--------------|
| Alta | **npm publish CI** | Workflow GitHub Actions que corre `pnpm publish` cuando se pushea un tag `v*`. Necesita `NPM_TOKEN` en secrets. | Ninguna |
| Alta | **E2E tests en CI funcionando** | El job `e2e` en `.github/workflows/ci.yml` existe pero hay que verificar que pasa. Corre Keycloak + PostgreSQL + Mailpit en Docker. Usa `pnpm test:e2e`. | Docker en runner |
| Media | **React Email templates reales** | `src/email-templates/` tiene archivos placeholder. Crear templates Welcome, ForgotPassword, MagicLink, VerifyEmail con `@react-email/components`. | Ninguna |
| Media | **Docs: recipes que falten** | `apps/docs/` tiene docs parciales. Completar guías: custom token store, custom email sender, rate limiting avanzado. | Ninguna |
| Baja | **Redis token store** | Implementar `ITokenStore` con Redis (ioredis) para producción. | `ioredis` |

---

## Nice-to-have para v2

| Feature | Por qué | Esfuerzo estimado |
|---------|---------|-------------------|
| Social login (Google/GitHub OIDC) | Keycloak ya lo soporta, exponerlo como endpoints unificados | 3-5 días |
| WebAuthn / Passkeys | Passwordless con `@simplewebauthn` | 5-7 días |
| Session management UI | Listar sesiones activas, revocar desde dashboard | 3-4 días |
| Rate limit con Redis | Escalar rate limiting horizontalmente (sustituye `ThrottlerStorageService` in-memory) | 1 día |
| Audit log | Eventos de auth persistidos en DB para compliance (quién, cuándo, desde dónde) | 3-5 días |
| MFA con SMS/email OTP | Segundo factor alternativo a TOTP usando nodemailer | 2-3 días |
| Account linking | Vincular cuentas de diferentes providers (Keycloak feat) | 2-3 días |
| Export/Import CLI con Diff | Comparar realm local vs remoto antes de importar | 2 días |
| Módulo Admin API NestJS | Wrapper tipado para Keycloak Admin REST API (CRUD users, roles, groups) | 5-7 días |

---

## Contexto técnico

### Estructura del monorepo (pnpm workspaces + turborepo)

```
keycloak-nestjs-authentication-api/
├── packages/auth/              ← El módulo publicable
│   ├── src/domain/             ← Capa más interna
│   ├── src/application/        ← Use cases
│   ├── src/infrastructure/     ← Keycloak, JWT, Email, Storage
│   ├── src/nestjs/             ← Module, Controllers, Guards, Filters
│   ├── src/cli/                ← auth-cli
│   ├── src/email-templates/    ← React Email templates
│   └── test/                   ← 270 tests
├── apps/demo-api/              ← Consumidor de ejemplo
│   └── test/auth.e2e-spec.ts   ← E2E tests (16)
├── apps/docs/                  ← Docusaurus docs site
├── docker/                     ← docker-compose.yml + keycloak realm JSON
└── .github/workflows/          ← CI (typecheck, build, test, e2e)
```

### Comandos clave

```bash
pnpm dev              # Turbo dev (watch all packages)
pnpm test             # Run all tests
pnpm test:e2e         # Build auth + run E2E tests (requiere Docker)
pnpm docker:up        # Levanta Keycloak + Mailpit + PostgreSQL
pnpm typecheck        # TypeScript check en todo el monorepo
pnpm build            # Build packages
```

### Docker compose

`docker/docker-compose.yml` levanta:
- Keycloak `:8080` con realm `test-realm` pre-configurado
- PostgreSQL para Keycloak `:5432`
- PostgreSQL para demo-api `:5434`
- Mailpit (SMTP `:1025`, UI `:8025`)

### Para publicar a npm

```bash
# 1. Bump version
pnpm --filter @luisjrez/nestjs-keycloak-auth version <major|minor|patch>

# 2. Build
pnpm --filter @luisjrez/nestjs-keycloak-auth build

# 3. Publish (requiere npm login + NPM_TOKEN configurado)
pnpm --filter @luisjrez/nestjs-keycloak-auth publish --access public

# 4. Tag en git
git tag v$(node -p "require('./packages/auth/package.json').version")
git push --tags
```

### Estado de CI

El workflow `ci.yml` ya corre `typecheck → build → test` en Node 20 y 22.
Hay un job `e2e` que levanta Keycloak vía Docker services + `docker compose`.
Package.json tiene `"publishConfig": { "access": "public" }` listo.

### Tokens de seguridad que hay que rotar antes de production

- `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` en el consumer
- `clientSecret` de Keycloak
- `KEYCLOAK_SERVER_URL` a HTTPS
- `cookieSecure: true`

### Últimos cambios de la sesión anterior

- Rate limiting dinámico en `forRootAsync` (lee de `AuthModuleOptions.rateLimit`)
- CSRF protection (`CsrfGuard` + `GET /auth/csrf`)
- `EmailNotVerifiedError` mapeado desde Keycloak "Account is not fully set up"
- Demo API: NestJS Logger, shutdown hooks, request logging
- TLS configurable en `MailpitEmailSender`
- 270 tests verdes, typecheck limpio
