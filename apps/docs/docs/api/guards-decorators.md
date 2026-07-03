# Guards and Decorators

## Guards

### JwtAuthGuard (global)

Applied automatically to all routes via `APP_GUARD`. Validates the JWT access token from the `Authorization` header.

```typescript
@UseGuards(JwtAuthGuard) // optional if it's the global guard
@Get("profile")
getProfile(@CurrentUser() user: AuthenticatedUser) {
  return user;
}
```

### OptionalAuthGuard

Works like `JwtAuthGuard` but allows unauthenticated requests — `req.user` will be `undefined`.

```typescript
@UseGuards(OptionalAuthGuard)
@Get("public-profile")
getPublicProfile(@CurrentUser() user?: AuthenticatedUser) {
  if (!user) return { name: "Anonymous" };
  return user;
}
```

## Decorators

### @Public()

Marks a route as publicly accessible (skips JWT validation):

```typescript
@Public()
@Post("login")
async login(@Body() dto: LoginDto) { ... }
```

### @CurrentUser()

Extracts the authenticated user from the request:

```typescript
@Get("me")
getProfile(@CurrentUser() user: AuthenticatedUser) {
  return user; // { sub, email, username, ... }
}
```

```typescript
interface AuthenticatedUser {
  sub: string;
  email: string;
  username: string;
  [key: string]: unknown;
}
```

## Error Filter

### AuthExceptionFilter (global)

Applied automatically via `APP_FILTER`. Maps `DomainError` subclasses to HTTP responses:

```
DomainError.status → HTTP status code
DomainError.code   → error code in response body
```

Example error response:
```json
{
  "error": "EMAIL_EXISTS",
  "message": "A user with this email already exists",
  "statusCode": 409,
  "timestamp": "2026-07-02T15:30:00.000Z"
}
```
