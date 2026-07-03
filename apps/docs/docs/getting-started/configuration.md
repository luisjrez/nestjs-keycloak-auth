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
