# Domain Errors

All errors extend `DomainError` and are automatically mapped to HTTP responses by `AuthExceptionFilter`.

| Error | Code | Status | Description |
|-------|------|--------|-------------|
| `EmailAlreadyExistsError` | `EMAIL_EXISTS` | 409 | Email already registered |
| `UsernameAlreadyExistsError` | `USERNAME_EXISTS` | 409 | Username already taken |
| `InvalidCredentialsError` | `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `EmailNotVerifiedError` | `EMAIL_NOT_VERIFIED` | 403 | Email not verified |
| `TokenExpiredError` | `TOKEN_EXPIRED` | 401 | Refresh or access token expired |
| `TokenInvalidError` | `TOKEN_INVALID` | 401 | Token malformed or invalid |
| `UserNotFoundError` | `USER_NOT_FOUND` | 404 | User does not exist |
| `AccountDisabledError` | `ACCOUNT_DISABLED` | 403 | Account disabled in Keycloak |
| `TwoFactorRequiredError` | `2FA_REQUIRED` | 403 | TOTP code required |
| `TwoFactorInvalidError` | `2FA_INVALID` | 401 | TOTP code incorrect |
| `TwoFactorAlreadyConfiguredError` | `2FA_ALREADY_CONFIGURED` | 409 | 2FA already set up |
| `RateLimitError` | `RATE_LIMIT` | 429 | Too many requests |
| `MagicLinkExpiredError` | `MAGIC_LINK_EXPIRED` | 410 | Magic link token expired |
| `MagicLinkAlreadyUsedError` | `MAGIC_LINK_USED` | 410 | Magic link already consumed |
| `ResetTokenExpiredError` | `RESET_TOKEN_EXPIRED` | 410 | Reset token expired |
| `WeakPasswordError` | `WEAK_PASSWORD` | 422 | Password doesn't meet requirements |
