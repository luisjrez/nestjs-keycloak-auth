# Module Options

## AuthModule.forRoot

Synchronous configuration with inline options:

```typescript
AuthModule.forRoot(options: AuthModuleOptions)
```

## AuthModule.forRootAsync

Asynchronous configuration (recommended for production):

```typescript
AuthModule.forRootAsync({
  imports: [...],
  inject: [...],
  useFactory: (...deps) => ({ ... }),
})
```

## AuthModuleOptions

```typescript
interface AuthModuleOptions {
  /** Path to keycloak-realm.json */
  keycloakConfigPath?: string;

  /** Inline Keycloak config */
  keycloak?: KeycloakConfig;

  /** JWT signing configuration */
  jwt: JwtConfig;

  /** Email sender configuration */
  email: EmailConfig;

  /** Token store implementation */
  tokenStore: ITokenStore;

  /** Base URL for email links (default: https://example.com) */
  baseUrl?: string;

  /** Secure cookie flag (default: false) */
  cookieSecure?: boolean;

  /** Cookie domain (optional) */
  cookieDomain?: string;
}
```

## Exports

The module exports:

- `AuthEventBus` — for listening to auth events
- `JwtTokenService` — for custom JWT operations
- `ReactEmailRenderer` — for custom email rendering
