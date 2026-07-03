# Changelog

## 0.1.0 (2026-07-02)

### Features
- Initial public release of `@luisjrez/nestjs-keycloak-auth`
- Clean Architecture: Domain → Application → Infrastructure → NestJS
- Keycloak-backed authentication: register, login, refresh, logout
- JWT access tokens (HS256 via jose) + httpOnly refresh cookie
- Forgot / Reset password with email notification
- Magic link authentication
- TOTP 2FA (speakeasy + QR code)
- 16 typed domain errors → HTTP status mapping
- AuthEventBus with 7 typed events
- CLI: `auth-cli init`, `export`, `import`
- React Email templates (Welcome, ForgotPassword, MagicLink, VerifyEmail)
- Input validation (class-validator) with global ValidationPipe
- Token hashing (SHA-256) in all stores
- Password complexity enforcement (uppercase, lowercase, number, special char)
- Configurable secure cookies (cookieSecure, cookieDomain)
- CORS with credentials support for httpOnly cookies
- Rate limiting documented with @nestjs/throttler peer dependency
- Production security guide (helmet, CSRF, etc.)

### Testing
- 266 unit tests
- 13 integration tests
- 16 E2E tests
- CI pipeline with typecheck, build, and test
