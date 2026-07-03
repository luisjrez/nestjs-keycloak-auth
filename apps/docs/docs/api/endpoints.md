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

**Errors:** `401 INVALID_CREDENTIALS`, `403 2FA_REQUIRED`

---

## POST /auth/refresh

Refresh the access token using the refresh token from the cookie, or from the body.

**Request:** (use cookie sent by login)
```json
{
  "refreshToken": "optional-refresh-token-from-body"
}
```

**Response** `200`:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "expiresIn": 900
}
```

**Errors:** `401 TOKEN_EXPIRED`, `401 TOKEN_INVALID`

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

Verify a TOTP code to complete 2FA enrollment.

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
