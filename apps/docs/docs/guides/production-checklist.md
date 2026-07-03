# Production Checklist

## 1. Security

### Required
- [ ] **Helmet** — Add `app.use(helmet())` in `main.ts`
- [ ] **CORS** — Restrict origin and enable `credentials: true`
- [ ] **Secure cookies** — Set `cookieSecure: true`
- [ ] **Cookie parser** — Add `app.use(cookieParser())`
- [ ] **JWT secrets** — Use strong, unique secrets via environment variables
- [ ] **Input validation** — Enabled by default (ValidationPipe in AuthModule)
- [ ] **HTTPS** — Use a reverse proxy (nginx, Caddy) or load balancer

### Recommended
- [ ] **Rate limiting** — Install `@nestjs/throttler` and configure
- [ ] **CSRF protection** — Use double-submit cookie pattern or SameSite=Lax
- [ ] **Password complexity** — Enabled by default (uppercase, lowercase, number, special char)

## 2. Keycloak

- [ ] **SMTP configured** — Set up email provider in Keycloak admin console
- [ ] **Client secret** — Use a strong, unique secret for your client
- [ ] **Realm backup** — Export and version-control your realm config

## 3. Monitoring

- [ ] **Failed login tracking** — Listen to `UserLoggedInEvent` and count failures
- [ ] **Alert on repeated failures** — Integrate with your monitoring system
- [ ] **Token cleanup** — Run `deleteExpired()` periodically (cron job)

## 4. Environment variables (.env)

```bash
# Auth
KEYCLOAK_SERVER_URL=https://keycloak.yourdomain.com
KEYCLOAK_REALM=your-realm
KEYCLOAK_CLIENT_ID=your-client
KEYCLOAK_CLIENT_SECRET=your-secret

# JWT
ACCESS_TOKEN_SECRET=<random-256-bit-key>
REFRESH_TOKEN_SECRET=<different-random-256-bit-key>

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxx
EMAIL_FROM=noreply@yourdomain.com

# App
APP_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production
```

## 5. Testing in production-like environment

- [ ] E2E tests pass against a real Keycloak instance
- [ ] Email delivery tested (not just Mailpit)
- [ ] 2FA flow verified end-to-end
- [ ] Token expiry and refresh tested
