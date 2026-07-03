# API Endpoints

All endpoints are prefixed with `/auth` (configurable via `app.setGlobalPrefix()`).

Global guard: `JwtAuthGuard` — all routes require JWT unless marked with `@Public()`.

## POST /auth/register

Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "StrongPass1!"
}
```

**Response** `201`:
```json
{
  "message": "Registration successful.",
  "user": {
    "id": "kc-user-id",
    "email": "user@example.com",
    "username": "johndoe",
    "emailVerified": true,
    "enabled": true,
    "createdAt": "2026-07-02T..."
  }
}
```

**Errors:** `409 EMAIL_EXISTS`, `409 USERNAME_EXISTS`, `422 WEAK_PASSWORD`

---

## POST /auth/login

Authenticate with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongPass1!"
}
```

**Response** `200`:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "expiresIn": 900,
  "user": {
    "id": "kc-user-id",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

Sets httpOnly cookie `refreshToken`.

If the user has TOTP 2FA enabled, **no tokens are issued**. Instead the response
is a challenge and the client must call [`POST /auth/2fa/complete`](#post-auth2facomplete):

```json
{
  "twoFactorRequired": true,
  "preAuthToken": "one-time-pre-auth-token",
  "expiresIn": 300
}
```

**Errors:** `401 INVALID_CREDENTIALS`, `423 ACCOUNT_LOCKED`

---

## POST /auth/2fa/complete

Second step of the 2FA login flow. Exchanges the single-use `preAuthToken` from
the login response plus a valid TOTP code for real tokens.

**Request:**
```json
{
  "preAuthToken": "one-time-pre-auth-token",
  "code": "123456"
}
```

**Response** `200`:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "expiresIn": 900,
  "user": { "id": "kc-user-id", "email": "user@example.com", "username": "johndoe" }
}
```

Sets httpOnly cookie `refreshToken`.

**Errors:** `401 TOKEN_INVALID` (unknown/used token), `401 TOKEN_EXPIRED`, `401 2FA_INVALID`

---

## POST /auth/refresh

Rotate the access + refresh tokens. The refresh token is read from the httpOnly
`refreshToken` cookie set at login — it is never accepted from the request body.

Refresh-token **rotation with reuse detection** is enforced: each refresh token
is single-use. Presenting a token that was already rotated revokes every session
for that user and returns `401 TOKEN_REUSE_DETECTED`.

**Request:** no body — send the cookie from login.

**Response** `200`:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "expiresIn": 900
}
```

**Errors:** `401` (missing cookie), `401 TOKEN_INVALID`, `401 TOKEN_EXPIRED`, `401 TOKEN_REUSE_DETECTED`

---

## POST /auth/logout

Invalidate the refresh token in Keycloak and clear the cookie.

**Headers:** `Authorization: Bearer <accessToken>`

**Response** `200`:
```json
{
  "message": "Logged out successfully"
}
```

---

## POST /auth/forgot-password

Send a password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response** `200`:
```json
{
  "message": "If the account exists, a password reset email has been sent."
}
```

Always returns 200 (don't reveal if email exists).

---

## POST /auth/reset-password

Reset password with the token received by email.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewStrongPass1!"
}
```

**Response** `200`:
```json
{
  "message": "Password has been reset successfully."
}
```

**Errors:** `410 RESET_TOKEN_EXPIRED`, `422 WEAK_PASSWORD`

---

## POST /auth/magic-link

Send a magic link email for passwordless login.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response** `200`:
```json
{
  "message": "If the account exists, a magic link has been sent."
}
```

---

## POST /auth/magic-link/verify

Verify a magic link token and receive JWT tokens.

**Request:**
```json
{
  "token": "magic-link-token-from-email"
}
```

**Response** `200`:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "expiresIn": 900
}
```

Sets httpOnly cookie `refreshToken`.

**Errors:** `410 MAGIC_LINK_EXPIRED`, `410 MAGIC_LINK_USED`

---

## POST /auth/2fa/setup

Enable TOTP 2FA for the authenticated user.

**Headers:** `Authorization: Bearer <accessToken>`

**Response** `200`:
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "otpauth://totp/..."
}
```

**Errors:** `409 2FA_ALREADY_CONFIGURED`

---

## POST /auth/2fa/verify

Verify a TOTP code to confirm 2FA enrollment. Once enrolled, subsequent logins
require the two-step flow ([`/auth/login`](#post-authlogin) →
[`/auth/2fa/complete`](#post-auth2facomplete)).

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "code": "123456"
}
```

**Response** `200`:
```json
{
  "verified": true
}
```

**Errors:** `401 2FA_INVALID`

---

## GET /auth/health

Liveness probe. Present unless `healthCheck.enabled` is `false` (then `404`).

**Response** `200`:
```json
{ "status": "ok", "timestamp": "2026-07-03T..." }
```

---

## GET /auth/csrf

Issue a CSRF token (only meaningful when `csrf.enabled` is `true`). Sets a
non-httpOnly `csrf-token` cookie and returns the same value to echo back in the
`x-csrf-token` header on mutating requests.

**Response** `200`:
```json
{ "csrfToken": "3f1c…" }
```

---

## GET /auth/me

Get the current authenticated user's profile.

**Headers:** `Authorization: Bearer <accessToken>`

**Response** `200`:
```json
{
  "sub": "kc-user-id",
  "email": "user@example.com",
  "username": "johndoe"
}
```
